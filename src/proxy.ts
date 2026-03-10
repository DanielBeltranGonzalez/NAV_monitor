import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

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

// ── CSRF: Origin check for state-changing API requests ────────────────────────

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function csrfCheck(request: NextRequest): NextResponse | null {
  if (!MUTATING_METHODS.has(request.method)) return null
  if (!request.nextUrl.pathname.startsWith('/api/')) return null

  const origin = request.headers.get('origin')
  // If no Origin header present (e.g. same-origin curl/server-side), allow
  if (!origin) return null

  // Support reverse proxy / Docker port-mapping scenarios
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const expected = forwardedHost
    ? `${forwardedProto ?? request.nextUrl.protocol.replace(':', '')}://${forwardedHost}`
    : request.nextUrl.origin

  if (origin !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}

// ── Public routes (no auth required) ─────────────────────────────────────────

const PUBLIC_PREFIXES = ['/auth/', '/api/auth/', '/_next/', '/favicon.ico']

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ── Middleware ────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production')
}

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
)

const COOKIE_NAME = 'session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds
// Renew session cookie when token is older than this threshold (1 hour)
const RENEW_THRESHOLD_SECS = 3600

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

  // CSRF check for mutating API requests
  const csrfError = csrfCheck(request)
  if (csrfError) return csrfError

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

    const response = addSecurityHeaders(NextResponse.next())

    // Sliding window: renew session cookie if token is older than RENEW_THRESHOLD_SECS
    const iat = typeof payload.iat === 'number' ? payload.iat : 0
    const nowSecs = Math.floor(Date.now() / 1000)
    if (nowSecs - iat > RENEW_THRESHOLD_SECS) {
      const newToken = await new SignJWT({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(SECRET)

      response.cookies.set(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_MAX_AGE,
      })
    }

    return response
  } catch {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
