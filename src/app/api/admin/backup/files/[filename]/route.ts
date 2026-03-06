import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { logEvent } from '@/lib/audit'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { execFileSync } from 'child_process'
import { resolve } from 'path'
import { tmpdir } from 'os'
import { prisma } from '@/lib/prisma'

const VALID_FILENAME = /^nav_\d{8}_\d{6}\.db$/
const SQLITE_MAGIC = 'SQLite format 3\0'

function resolveBackupDir(): string | null {
  const candidates = ['/data/backups', resolve(process.cwd(), 'prisma/backups')]
  return candidates.find(existsSync) ?? null
}

function resolveDbPath(): string | null {
  const dbUrl = process.env.DATABASE_URL ?? ''
  if (dbUrl.startsWith('file:')) {
    const filePart = dbUrl.slice('file:'.length)
    if (filePart.startsWith('/')) return filePart
    return resolve(process.cwd(), 'prisma', filePart)
  }
  const candidates = ['/data/nav.db', resolve(process.cwd(), 'prisma/nav.db'), resolve(process.cwd(), 'prisma/dev.db')]
  for (const p of candidates) {
    try { readFileSync(p); return p } catch { /* skip */ }
  }
  return null
}

function getTablesFromFile(dbPath: string): string[] {
  const code = `const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(${JSON.stringify(dbPath)});const r=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();process.stdout.write(JSON.stringify(r.map(x=>x.name)));db.close();`
  const out = execFileSync(process.execPath, ['-e', code], {
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  })
  return JSON.parse(out) as string[]
}

function validateSchema(buffer: Buffer, currentDbPath: string): { ok: boolean; missing?: string[] } {
  const tmpPath = resolve(tmpdir(), `nav_schema_check_${Date.now()}.db`)
  try {
    writeFileSync(tmpPath, buffer)
    const required = getTablesFromFile(currentDbPath)
    const existing = getTablesFromFile(tmpPath)
    const missing = required.filter(t => !existing.includes(t))
    return missing.length === 0 ? { ok: true } : { ok: false, missing }
  } catch {
    return { ok: false }
  } finally {
    try { unlinkSync(tmpPath) } catch { /* ignore */ }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { filename } = await params
  if (!VALID_FILENAME.test(filename)) {
    return NextResponse.json({ error: 'Nombre de archivo inválido' }, { status: 400 })
  }

  const backupDir = resolveBackupDir()
  if (!backupDir) return NextResponse.json({ error: 'No se encontró el directorio de backups' }, { status: 404 })

  const filePath = resolve(backupDir, filename)
  let buffer: Buffer
  try {
    buffer = readFileSync(filePath)
  } catch {
    return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { filename } = await params
  if (!VALID_FILENAME.test(filename)) {
    return NextResponse.json({ error: 'Nombre de archivo inválido' }, { status: 400 })
  }

  const backupDir = resolveBackupDir()
  if (!backupDir) return NextResponse.json({ error: 'No se encontró el directorio de backups' }, { status: 404 })

  const filePath = resolve(backupDir, filename)
  let buffer: Buffer
  try {
    buffer = readFileSync(filePath)
  } catch {
    return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })
  }

  const magic = buffer.slice(0, 16).toString('binary')
  if (magic !== SQLITE_MAGIC) {
    return NextResponse.json({ error: 'El archivo no es una base de datos SQLite válida' }, { status: 400 })
  }

  const dbPath = resolveDbPath()
  if (!dbPath) {
    return NextResponse.json({ error: 'No se encontró la ruta de la base de datos' }, { status: 500 })
  }

  const schemaCheck = validateSchema(buffer, dbPath)
  if (!schemaCheck.ok) {
    const missing = schemaCheck.missing?.join(', ') ?? 'desconocidas'
    return NextResponse.json(
      { error: `El backup no es compatible con esta versión de la aplicación. Tablas faltantes: ${missing}` },
      { status: 400 }
    )
  }

  await prisma.$disconnect()

  try {
    writeFileSync(dbPath, buffer)
  } catch {
    return NextResponse.json({ error: 'No se pudo escribir la base de datos' }, { status: 500 })
  }

  await logEvent('BACKUP_RESTORED', user.email)

  return NextResponse.json({ ok: true })
}
