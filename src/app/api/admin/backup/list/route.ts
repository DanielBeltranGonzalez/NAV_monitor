import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { readdirSync, statSync, existsSync } from 'fs'
import { resolve } from 'path'

const VALID_FILENAME = /^nav_\d{8}_\d{6}\.db$/

function resolveBackupDir(): string | null {
  const candidates = ['/data/backups', resolve(process.cwd(), 'prisma/backups')]
  return candidates.find(existsSync) ?? null
}

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const backupDir = resolveBackupDir()
  if (!backupDir) return NextResponse.json([])

  let files: { name: string; size: number; createdAt: string }[]
  try {
    files = readdirSync(backupDir)
      .filter((f) => VALID_FILENAME.test(f))
      .map((name) => {
        const stat = statSync(resolve(backupDir, name))
        return { name, size: stat.size, createdAt: stat.mtime.toISOString() }
      })
      .sort((a, b) => b.name.localeCompare(a.name))
  } catch {
    return NextResponse.json({ error: 'Error leyendo el directorio de backups' }, { status: 500 })
  }

  return NextResponse.json(files)
}
