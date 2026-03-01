import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const { name, bankId } = await request.json()
  const data: { name?: string; bankId?: number } = {}
  if (name && typeof name === 'string' && name.trim()) data.name = name.trim()
  if (bankId) data.bankId = Number(bankId)
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const investment = await prisma.investment.update({
    where: { id },
    data,
    include: { bank: true },
  })
  return NextResponse.json(investment)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  await prisma.investment.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
