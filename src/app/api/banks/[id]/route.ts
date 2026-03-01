import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || name.trim() === '')
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const bank = await prisma.bank.findUnique({ where: { id } })
  if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
  if (bank.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const updated = await prisma.bank.update({ where: { id }, data: { name: name.trim() } })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return NextResponse.json({ error: 'Bank name already exists' }, { status: 409 })
      if (e.code === 'P2025') return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const bank = await prisma.bank.findUnique({ where: { id } })
  if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
  if (bank.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await prisma.bank.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2003' || e.code === 'P2014')
        return NextResponse.json({ error: 'Cannot delete bank with linked investments' }, { status: 409 })
      if (e.code === 'P2025')
        return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
