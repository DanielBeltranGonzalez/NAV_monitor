import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const requests = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 120 // per window per IP

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const entry = requests.get(ip)

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return NextResponse.next()
  }

  entry.count++
  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
