import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const { name } = await request.json()
  if (!name || typeof name !== 'string' || name.trim() === '')
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  try {
    const bank = await prisma.bank.update({ where: { id }, data: { name: name.trim() } })
    return NextResponse.json(bank)
  } catch {
    return NextResponse.json({ error: 'Bank name already exists' }, { status: 409 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  try {
    await prisma.bank.delete({ where: { id } })
  } catch {
    return NextResponse.json(
      { error: 'Cannot delete bank with linked investments' },
      { status: 409 }
    )
  }
  return new NextResponse(null, { status: 204 })
}
