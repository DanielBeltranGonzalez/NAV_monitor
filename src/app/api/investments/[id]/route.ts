import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json()
  const { name, bankId, comment } = body
  const data: { name?: string; bankId?: number; comment?: string | null } = {}
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (trimmedName) {
    if (trimmedName.length > 255)
      return NextResponse.json(
        { error: 'Name must be between 1 and 255 characters' },
        { status: 400 }
      )
    data.name = trimmedName
  }
  if (bankId) {
    const bank = await prisma.bank.findUnique({ where: { id: Number(bankId) } })
    if (!bank || bank.userId !== user.id) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }
    data.bankId = Number(bankId)
  }
  if ('comment' in body) {
    const trimmed = typeof comment === 'string' ? comment.trim().slice(0, 1000) : null
    data.comment = trimmed || null
  }
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const investment = await prisma.investment.findUnique({ where: { id } })
  if (!investment) return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
  if (investment.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const effectiveName = data.name ?? investment.name
  const effectiveBankId = data.bankId ?? investment.bankId
  const duplicate = await prisma.investment.findFirst({
    where: { name: effectiveName, bankId: effectiveBankId, userId: user.id, NOT: { id } },
  })
  if (duplicate) {
    return NextResponse.json(
      { error: 'Ya existe una inversión con ese nombre en este banco' },
      { status: 409 }
    )
  }

  try {
    const updated = await prisma.investment.update({
      where: { id },
      data,
      include: { bank: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const investment = await prisma.investment.findUnique({ where: { id } })
  if (!investment) return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
  if (investment.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await prisma.investment.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
