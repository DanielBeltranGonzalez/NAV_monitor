import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const targetId = Number(id)

  if (targetId === user.id) {
    return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
  }

  const { role } = await request.json()
  if (role !== 'ADMIN' && role !== 'USER') {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  // Prevent downgrading the last admin
  if (role === 'USER') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'No puedes degradar al único administrador' },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role },
    select: { id: true, email: true, role: true, createdAt: true },
  })
  await logEvent('ROLE_CHANGED', user.email, updated.email)

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const targetId = Number(id)

  if (targetId === user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  // Prevent deleting the last admin
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { email: true, role: true },
  })
  if (target?.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'No puedes eliminar al único administrador' },
        { status: 400 }
      )
    }
  }
  await prisma.user.delete({ where: { id: targetId } })
  await logEvent('ACCOUNT_DELETED', user.email, target?.email)
  return new NextResponse(null, { status: 204 })
}
