import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const investments = await prisma.investment.findMany({
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
  const body = await request.json()
  const { name, bankId } = body

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!bankId || isNaN(Number(bankId))) {
    return NextResponse.json({ error: 'Bank is required' }, { status: 400 })
  }

  const investment = await prisma.investment.create({
    data: { name: name.trim(), bankId: Number(bankId) },
    include: { bank: true },
  })
  return NextResponse.json(investment, { status: 201 })
}
