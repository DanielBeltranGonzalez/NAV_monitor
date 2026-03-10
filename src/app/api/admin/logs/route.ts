import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { existsSync, readFileSync, statSync } from 'fs'

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
  const maxLines = Math.min(parseInt(url.searchParams.get('lines') ?? '500', 10) || 500, 5000)

  const buffer = readFileSync(LOG_PATH)
  const stat = statSync(LOG_PATH)

  if (download) {
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nav-monitor.log"',
      },
    })
  }

  const all = buffer.toString('utf8').split('\n').filter(Boolean)
  const lines = all.slice(-maxLines)

  return NextResponse.json({ available: true, lines, total: all.length, size: stat.size })
}
