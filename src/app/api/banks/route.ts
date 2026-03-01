import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const banks = await prisma.bank.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(banks)
}

export async function POST(request: Request) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  try {
    const bank = await prisma.bank.create({
      data: { name: name.trim(), userId: user.id },
    })
    return NextResponse.json(bank, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Bank already exists' }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
