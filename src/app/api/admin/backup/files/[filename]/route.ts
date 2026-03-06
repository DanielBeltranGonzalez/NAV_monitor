import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { logEvent } from '@/lib/audit'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
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

  await prisma.$disconnect()

  try {
    writeFileSync(dbPath, buffer)
  } catch {
    return NextResponse.json({ error: 'No se pudo escribir la base de datos' }, { status: 500 })
  }

  await logEvent('BACKUP_RESTORED', user.email)

  return NextResponse.json({ ok: true })
}
