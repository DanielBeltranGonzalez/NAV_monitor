import bcryptjs from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
)

const COOKIE_NAME = 'session'
const TOKEN_TTL = '7d'

// ── Password helpers ──────────────────────────────────────────────────────────

export function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12)
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash)
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

export async function signToken(payload: { sub: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(SECRET)
}

export async function verifyToken(
  token: string
): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null
    return { sub: payload.sub, email: payload.email }
  } catch {
    return null
  }
}

// ── Session helper ────────────────────────────────────────────────────────────

export async function getSessionUser(
  request: NextRequest | Request
): Promise<{ id: number; email: string } | null> {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  if (!match) return null

  const token = decodeURIComponent(match[1])
  const payload = await verifyToken(token)
  if (!payload) return null

  return { id: Number(payload.sub), email: payload.email }
}

export { COOKIE_NAME }
