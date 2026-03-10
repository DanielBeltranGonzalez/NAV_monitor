import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { existsSync, createReadStream, statSync } from 'fs'
import { execFileSync } from 'child_process'

const LOG_PATH = '/data/logs/nav.log'

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!existsSync(LOG_PATH)) {
    return NextResponse.json({ available: false, lines: [], total: 0, size: 0 })
  }

  const url = new URL(request.url)
  const download = url.searchParams.get('download') === '1'
  const maxLines = Math.max(1, Math.min(parseInt(url.searchParams.get('lines') ?? '500', 10) || 500, 5000))

  const stat = statSync(LOG_PATH)

  if (download) {
    // Stream directo del fichero sin cargarlo en memoria
    const fileStream = createReadStream(LOG_PATH)
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk))
        fileStream.on('end', () => controller.close())
        fileStream.on('error', (err) => controller.error(err))
      },
    })
    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nav-monitor.log"',
        'Content-Length': String(stat.size),
      },
    })
  }

  // tail -n N: sólo carga las últimas N líneas en el proceso hijo
  let output = ''
  try {
    output = execFileSync('tail', ['-n', String(maxLines), LOG_PATH], {
      encoding: 'utf8',
      timeout: 5_000,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    })
  } catch {
    return NextResponse.json({ error: 'Error leyendo logs' }, { status: 500 })
  }

  // wc -l también en proceso hijo para no bloquear Node
  let total = 0
  try {
    const wc = execFileSync('wc', ['-l', LOG_PATH], { encoding: 'utf8', timeout: 5_000 })
    total = parseInt(wc.trim().split(/\s+/)[0], 10) || 0
  } catch { /* no crítico */ }

  const lines = output.split('\n').filter(Boolean)
  return NextResponse.json({ available: true, lines, total, size: stat.size })
}
