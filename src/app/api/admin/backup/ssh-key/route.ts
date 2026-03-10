import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync } from 'fs'
import { resolve } from 'path'
import { execFileSync } from 'child_process'

function resolveSSHDir(): string {
  const dir = existsSync('/data') ? '/data/ssh' : resolve(process.cwd(), 'prisma/ssh')
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  // Migración: renombrar clave antigua nav_backup_rsa → nav_backup_ed25519
  const oldKey = resolve(dir, 'nav_backup_rsa')
  const newKey = resolve(dir, 'nav_backup_ed25519')
  if (existsSync(oldKey) && !existsSync(newKey)) {
    try {
      renameSync(oldKey, newKey)
      if (existsSync(`${oldKey}.pub`)) renameSync(`${oldKey}.pub`, `${newKey}.pub`)
    } catch { /* no crítico */ }
  }
  return dir
}

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sshDir = resolveSSHDir()
  const pubKeyPath = resolve(sshDir, 'nav_backup_ed25519.pub')

  if (!existsSync(pubKeyPath)) {
    return NextResponse.json({ publicKey: null })
  }

  const publicKey = readFileSync(pubKeyPath, 'utf8').trim()
  return NextResponse.json({ publicKey })
}

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sshDir = resolveSSHDir()
  const keyPath = resolve(sshDir, 'nav_backup_ed25519')

  // Eliminar claves existentes para evitar prompt interactivo de sobreescritura
  try { unlinkSync(keyPath) } catch { /* no existía */ }
  try { unlinkSync(`${keyPath}.pub`) } catch { /* no existía */ }

  try {
    execFileSync(
      'ssh-keygen',
      ['-t', 'ed25519', '-N', '', '-f', keyPath, '-C', 'nav-backup'],
      { timeout: 10_000 }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ENOENT') || msg.includes('not found')) {
      return NextResponse.json(
        { error: 'ssh-keygen no está disponible en este entorno' },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: `Error generando clave SSH: ${msg}` }, { status: 500 })
  }

  const publicKey = readFileSync(`${keyPath}.pub`, 'utf8').trim()
  return NextResponse.json({ publicKey })
}
