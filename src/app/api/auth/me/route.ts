import { NextResponse } from 'next/server'
import { getSessionUser, COOKIE_NAME } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ id: user.id, email: user.email, role: user.role })
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'ADMIN') {
    return NextResponse.json({ error: 'Los administradores no pueden eliminar su propia cuenta. Pide a otro administrador que lo haga.' }, { status: 403 })
  }

  await prisma.user.delete({ where: { id: user.id } })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return response
}
