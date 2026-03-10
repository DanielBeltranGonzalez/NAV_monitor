import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { logEvent } from '@/lib/audit'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { spawn } from 'child_process'

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

function runRsync(args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    const child = spawn('rsync', args, { encoding: 'utf8' } as never)

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      child.kill()
      resolve({ stdout, stderr: stderr + '\nTimed out', code: null })
    }, timeoutMs)

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, code })
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ stdout, stderr: err.message, code: null })
    })
  })
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
  const keyPath = resolve(sshDir, 'nav_backup_ed25519')
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

  const sshCmd = `ssh -i "${keyPath}"${portFlag} -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="${knownHostsPath}" -o BatchMode=yes`

  const result = await runRsync(
    ['-avz', '--mkpath', '-e', sshCmd, backupDir + '/', `${config.host}:${remotePath}/`],
    60_000
  )

  if (result.stderr.includes('ENOENT') || result.stderr.includes('not found')) {
    return NextResponse.json(
      { ok: false, error: 'rsync no está disponible en este entorno. En Docker se instala automáticamente.' },
      { status: 500 }
    )
  }

  if (result.code !== 0) {
    return NextResponse.json(
      { ok: false, error: result.stderr || result.stdout || `rsync salió con código ${result.code}` },
      { status: 500 }
    )
  }

  // Sincronizar logs si el directorio existe
  let logsWarning: string | undefined
  if (existsSync('/data/logs')) {
    const logsResult = await runRsync(
      ['-avz', '--mkpath', '-e', sshCmd, '/data/logs/', `${config.host}:${remotePath}/logs/`],
      30_000
    )
    if (logsResult.code !== 0) {
      logsWarning = `Backups sincronizados, pero falló la sync de logs: ${logsResult.stderr || `código ${logsResult.code}`}`
    }
  }

  // Actualizar lastSync
  config.lastSync = new Date().toISOString()
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')

  await logEvent('BACKUP_SYNC', user.email)

  return NextResponse.json({ ok: true, output: result.stdout, warning: logsWarning })
}
