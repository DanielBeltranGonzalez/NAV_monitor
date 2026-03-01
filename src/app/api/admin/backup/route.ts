import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { logEvent } from '@/lib/audit'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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

  return new NextResponse(dbBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
