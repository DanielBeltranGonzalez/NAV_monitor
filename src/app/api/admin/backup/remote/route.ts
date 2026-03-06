import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function resolveRemoteConfigPath(): string {
  const base = existsSync('/data') ? '/data' : resolve(process.cwd(), 'prisma')
  return resolve(base, 'backup_remote.json')
}

interface RemoteConfig {
  host: string | null
  port: number | null
  path: string
  lastSync: string | null
}

function readConfig(): RemoteConfig {
  const configPath = resolveRemoteConfigPath()
  if (!existsSync(configPath)) {
    return { host: null, port: null, path: '~/nav-backups', lastSync: null }
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf8')) as RemoteConfig
  } catch {
    return { host: null, port: null, path: '~/nav-backups', lastSync: null }
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = readConfig()
  const newConfig: RemoteConfig = { host: null, port: null, path: existing.path, lastSync: null }
  writeFileSync(resolveRemoteConfigPath(), JSON.stringify(newConfig, null, 2), 'utf8')
  return NextResponse.json({ ok: true })
}

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(readConfig())
}

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.host !== 'string') {
    return NextResponse.json({ error: 'host es requerido' }, { status: 400 })
  }

  const host = body.host.trim()
  if (!/^[^@\s]+@[^@\s]+$/.test(host)) {
    return NextResponse.json(
      { error: 'Formato inválido. Usa usuario@servidor' },
      { status: 400 }
    )
  }

  const remotePath = typeof body.path === 'string' && body.path.trim()
    ? body.path.trim()
    : '~/nav-backups'

  let port: number | null = null
  if (body.port !== undefined && body.port !== null && body.port !== '') {
    const p = Number(body.port)
    if (!Number.isInteger(p) || p < 1 || p > 65535) {
      return NextResponse.json({ error: 'Puerto inválido (1-65535)' }, { status: 400 })
    }
    port = p
  }

  const existing = readConfig()
  const newConfig: RemoteConfig = {
    host,
    port,
    path: remotePath,
    lastSync: existing.lastSync,
  }

  writeFileSync(resolveRemoteConfigPath(), JSON.stringify(newConfig, null, 2), 'utf8')
  return NextResponse.json({ ok: true })
}
