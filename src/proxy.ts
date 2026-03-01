import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// ── Rate limiting ─────────────────────────────────────────────────────────────

const requests = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 120

function rateLimit(request: NextRequest): NextResponse | null {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const entry = requests.get(ip)

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }

  entry.count++
  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  return null
}

// ── Public routes (no auth required) ─────────────────────────────────────────

const PUBLIC_PREFIXES = ['/auth/', '/api/auth/', '/_next/', '/favicon.ico']

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ── Proxy (middleware) ────────────────────────────────────────────────────────

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit all /api/* routes
  if (pathname.startsWith('/api/')) {
    const limited = rateLimit(request)
    if (limited) return limited
  }

  // Public routes bypass auth check
  if (isPublic(pathname)) return NextResponse.next()

  // Verify session cookie
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  const token = match ? decodeURIComponent(match[1]) : null

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
