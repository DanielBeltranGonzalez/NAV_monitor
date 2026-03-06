import bcryptjs from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido. Debes configurarlo en producción.')
}

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
)

const COOKIE_NAME = 'session'
const TOKEN_TTL = '24h'

// ── Password helpers ──────────────────────────────────────────────────────────

/**
 * Returns an error message if the password doesn't meet complexity requirements,
 * or null if it's valid.
 * Rules: min 8 chars, at least one uppercase, one lowercase, one digit.
 */
export function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula'
  if (!/[a-z]/.test(password)) return 'La contraseña debe incluir al menos una minúscula'
  if (!/[0-9]/.test(password)) return 'La contraseña debe incluir al menos un número'
  return null
}

export function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12)
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash)
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

export async function signToken(payload: { sub: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(SECRET)
}

export async function verifyToken(
  token: string
): Promise<{ sub: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null
    const role = typeof payload.role === 'string' ? payload.role : 'USER'
    return { sub: payload.sub, email: payload.email, role }
  } catch {
    return null
  }
}

// ── Session helper ────────────────────────────────────────────────────────────

export async function getSessionUser(
  request: NextRequest | Request
): Promise<{ id: number; email: string; role: string } | null> {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  if (!match) return null

  const token = decodeURIComponent(match[1])
  const payload = await verifyToken(token)
  if (!payload) return null

  return { id: Number(payload.sub), email: payload.email, role: payload.role }
}

export { COOKIE_NAME }
