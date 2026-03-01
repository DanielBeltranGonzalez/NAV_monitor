import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const { name, bankId } = await request.json()
  const data: { name?: string; bankId?: number } = {}
  if (name && typeof name === 'string' && name.trim()) data.name = name.trim()
  if (bankId) data.bankId = Number(bankId)
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  try {
    const investment = await prisma.investment.update({
      where: { id },
      data,
      include: { bank: true },
    })
    return NextResponse.json(investment)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
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
