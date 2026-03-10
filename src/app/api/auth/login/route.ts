import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken, COOKIE_NAME } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)
    return NextResponse.json(
      { error: `Cuenta bloqueada. Inténtalo de nuevo en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.` },
      { status: 429 }
    )
  }

  const valid = await comparePassword(password, user.passwordHash)
  if (!valid) {
    const attempts = user.loginAttempts + 1
    const locked = attempts >= MAX_ATTEMPTS
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    })
    const error = locked
      ? `Demasiados intentos fallidos. Cuenta bloqueada ${LOCKOUT_MINUTES} minutos.`
      : `Credenciales incorrectas. Intentos restantes: ${MAX_ATTEMPTS - attempts}`
    return NextResponse.json({ error }, { status: 401 })
  }

  // Success: reset counters
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), loginAttempts: 0, lockedUntil: null },
  })
  await logEvent('USER_LOGIN', user.email)

  const token = await signToken({ sub: String(user.id), email: user.email, role: user.role })

  const response = NextResponse.json({ email: user.email })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
  return response
}
