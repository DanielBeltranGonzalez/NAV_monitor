import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hashPassword } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generatePassword(length = 12): string {
  return Array.from({ length }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const targetId = Number(id)

  if (targetId === user.id) {
    return NextResponse.json(
      { error: 'No puedes resetear tu propia contraseña desde aquí' },
      { status: 400 }
    )
  }

  const password = generatePassword()
  const passwordHash = await hashPassword(password)

  const target = await prisma.user.update({
    where: { id: targetId },
    data: { passwordHash },
    select: { email: true },
  })
  await logEvent('PASSWORD_RESET', user.email, target.email)

  return NextResponse.json({ password })
}
