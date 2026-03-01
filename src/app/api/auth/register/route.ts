import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken, COOKIE_NAME, validatePasswordComplexity } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
  }
  const pwError = validatePasswordComplexity(password)
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({ data: { email, passwordHash } })
  await logEvent('USER_REGISTERED', user.email)

  const token = await signToken({ sub: String(user.id), email: user.email, role: user.role })

  const response = NextResponse.json({ email: user.email }, { status: 201 })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
  return response
}
