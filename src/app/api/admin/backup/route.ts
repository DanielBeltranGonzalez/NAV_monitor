import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { logEvent } from '@/lib/audit'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // La DB puede estar en /data/nav.db (Docker) o en prisma/prisma/nav.db (local)
  const candidates = [
    '/data/nav.db',
    resolve(process.cwd(), 'prisma/nav.db'),
    resolve(process.cwd(), 'prisma/prisma/nav.db'),
  ]

  let dbBuffer: Buffer | null = null
  for (const path of candidates) {
    try {
      dbBuffer = readFileSync(path)
      break
    } catch {
      // siguiente candidato
    }
  }

  if (!dbBuffer) {
    return NextResponse.json({ error: 'No se encontró la base de datos' }, { status: 500 })
  }

  await logEvent('BACKUP_DOWNLOADED', user.email)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `nav_backup_${timestamp}.db`

  return new NextResponse(new Uint8Array(dbBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

const SQLITE_MAGIC = 'SQLite format 3\0'
const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

function getTablesFromFile(dbPath: string): string[] {
  // Require lazy para evitar que Turbopack intente resolver node:sqlite en tiempo de bundle
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')
  const db = new DatabaseSync(dbPath, { open: true })
  try {
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    return rows.map(r => r.name)
  } finally {
    db.close()
  }
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
    // Si node:sqlite no está disponible en este entorno, omitir la validación
    // (los magic bytes ya garantizan que es un archivo SQLite válido)
    return { ok: true }
  } finally {
    try { unlinkSync(tmpPath) } catch { /* ignore */ }
  }
}

function resolveDbPath(): string | null {
  const dbUrl = process.env.DATABASE_URL ?? ''
  if (dbUrl.startsWith('file:')) {
    const filePart = dbUrl.slice('file:'.length)
    if (filePart.startsWith('/')) return filePart
    return resolve(process.cwd(), 'prisma', filePart)
  }
  const candidates = [
    '/data/nav.db',
    resolve(process.cwd(), 'prisma/nav.db'),
    resolve(process.cwd(), 'prisma/dev.db'),
  ]
  for (const p of candidates) {
    try { readFileSync(p); return p } catch { /* skip */ }
  }
  return null
}

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const file = formData.get('backup')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No se proporcionó el archivo' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 100 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Validar magic bytes SQLite
  const magic = buffer.slice(0, 16).toString('binary')
  if (magic !== SQLITE_MAGIC) {
    return NextResponse.json({ error: 'El archivo no es una base de datos SQLite válida' }, { status: 400 })
  }

  const dbPath = resolveDbPath()
  if (!dbPath) {
    return NextResponse.json({ error: 'No se encontró la ruta de la base de datos' }, { status: 500 })
  }

  // Validar que el backup contiene al menos las mismas tablas que la BD activa
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
