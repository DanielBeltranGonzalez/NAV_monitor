import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

function resolveSSHDir(): string {
  const dir = existsSync('/data') ? '/data/ssh' : resolve(process.cwd(), 'prisma/ssh')
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  return dir
}

function resolveRemoteConfigPath(): string {
  const base = existsSync('/data') ? '/data' : resolve(process.cwd(), 'prisma')
  return resolve(base, 'backup_remote.json')
}

function resolveBackupDir(): string | null {
  const candidates = ['/data/backups', resolve(process.cwd(), 'prisma/backups')]
  return candidates.find(existsSync) ?? null
}

interface RemoteConfig {
  host: string | null
  port: number | null
  path: string
  lastSync: string | null
}

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const configPath = resolveRemoteConfigPath()
  if (!existsSync(configPath)) {
    return NextResponse.json(
      { ok: false, error: 'No hay configuración remota. Configura el servidor destino primero.' },
      { status: 400 }
    )
  }

  let config: RemoteConfig
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8')) as RemoteConfig
  } catch {
    return NextResponse.json({ ok: false, error: 'Error leyendo configuración remota.' }, { status: 500 })
  }

  if (!config.host) {
    return NextResponse.json(
      { ok: false, error: 'No hay servidor remoto configurado.' },
      { status: 400 }
    )
  }

  const sshDir = resolveSSHDir()
  const keyPath = resolve(sshDir, 'nav_backup_rsa')
  if (!existsSync(keyPath)) {
    return NextResponse.json(
      { ok: false, error: 'No hay clave SSH generada. Genera una clave primero.' },
      { status: 400 }
    )
  }

  const backupDir = resolveBackupDir()
  if (!backupDir) {
    return NextResponse.json(
      { ok: false, error: 'No se encontró el directorio de backups.' },
      { status: 500 }
    )
  }

  const knownHostsPath = resolve(sshDir, 'known_hosts')
  const remotePath = config.path || '~/nav-backups'
  const portNum = config.port ? parseInt(String(config.port), 10) : NaN
  const portFlag = !isNaN(portNum) && portNum > 0 && portNum <= 65535 ? ` -p ${portNum}` : ''

  const sshCmd = `ssh -i ${keyPath}${portFlag} -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=${knownHostsPath} -o BatchMode=yes`

  const result = spawnSync(
    'rsync',
    ['-avz', '--mkpath', '-e', sshCmd, backupDir + '/', `${config.host}:${remotePath}/`],
    { encoding: 'utf8', timeout: 60_000 }
  )

  if (result.error) {
    const msg = result.error.message
    if (msg.includes('ENOENT') || msg.includes('not found')) {
      return NextResponse.json(
        { ok: false, error: 'rsync no está disponible en este entorno. En Docker se instala automáticamente.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  if (result.status !== 0) {
    return NextResponse.json(
      { ok: false, error: result.stderr || result.stdout || `rsync salió con código ${result.status}` },
      { status: 500 }
    )
  }

  // Sincronizar logs si el directorio existe
  if (existsSync('/data/logs')) {
    spawnSync(
      'rsync',
      ['-avz', '--mkpath', '-e', sshCmd, '/data/logs/', `${config.host}:${remotePath}/logs/`],
      { encoding: 'utf8', timeout: 30_000 }
    )
  }

  // Actualizar lastSync
  config.lastSync = new Date().toISOString()
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')

  return NextResponse.json({ ok: true, output: result.stdout })
}
