import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// ── Rate limiting ─────────────────────────────────────────────────────────────

const requests = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 120

// Stricter limit for login endpoint: 10 attempts per IP per 15 minutes
const loginRequests = new Map<string, { count: number; resetAt: number }>()
const LOGIN_WINDOW_MS = 15 * 60_000
const LOGIN_MAX_REQUESTS = 10

function rateLimit(request: NextRequest): NextResponse | null {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()

  // Strict per-endpoint limit for login
  if (request.nextUrl.pathname === '/api/auth/login') {
    const entry = loginRequests.get(ip)
    if (!entry || now > entry.resetAt) {
      loginRequests.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    } else {
      entry.count++
      if (entry.count > LOGIN_MAX_REQUESTS) {
        return NextResponse.json(
          { error: 'Demasiados intentos. Espera 15 minutos.' },
          { status: 429 }
        )
      }
    }
  }

  // Global limit for all API routes
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

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production')
}

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
)

// ── Security headers ───────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"
  )
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit all /api/* routes
  if (pathname.startsWith('/api/')) {
    const limited = rateLimit(request)
    if (limited) return limited
  }

  // Public routes bypass auth check
  if (isPublic(pathname)) return addSecurityHeaders(NextResponse.next())

  // Verify session cookie
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  const token = match ? decodeURIComponent(match[1]) : null

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, SECRET)

    // Admin-only routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (payload.role !== 'ADMIN') {
        return pathname.startsWith('/api/')
          ? addSecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
          : NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return addSecurityHeaders(NextResponse.next())
  } catch {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
