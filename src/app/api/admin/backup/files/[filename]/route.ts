import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const VALID_FILENAME = /^nav_\d{8}_\d{6}\.db$/

function resolveBackupDir(): string | null {
  const candidates = ['/data/backups', resolve(process.cwd(), 'prisma/backups')]
  return candidates.find(existsSync) ?? null
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
