import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const investments = await prisma.investment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      bank: true,
      values: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })
  return NextResponse.json(investments)
}

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, bankId, comment } = body

  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName || trimmedName.length > 255) {
    return NextResponse.json(
      { error: 'Name must be between 1 and 255 characters' },
      { status: 400 }
    )
  }
  if (!bankId || isNaN(Number(bankId))) {
    return NextResponse.json({ error: 'Bank is required' }, { status: 400 })
  }

  const trimmedComment = typeof comment === 'string' ? comment.trim().slice(0, 1000) : null

  const bank = await prisma.bank.findUnique({ where: { id: Number(bankId) } })
  if (!bank || bank.userId !== user.id) {
    return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
  }

  const existing = await prisma.investment.findFirst({
    where: { name: trimmedName, bankId: Number(bankId), userId: user.id },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Ya existe una inversión con ese nombre en este banco' },
      { status: 409 }
    )
  }

  const investment = await prisma.investment.create({
    data: { name: trimmedName, bankId: Number(bankId), userId: user.id, comment: trimmedComment || null },
    include: { bank: true },
  })
  return NextResponse.json(investment, { status: 201 })
}
