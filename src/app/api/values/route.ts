import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const body = await request.json()
  const { investmentId, date, value } = body

  if (!investmentId || !date || value === undefined) {
    return NextResponse.json(
      { error: 'investmentId, date and value are required' },
      { status: 400 }
    )
  }

  const dateObj = new Date(date)
  // Normalise to start of day UTC
  dateObj.setUTCHours(0, 0, 0, 0)

  const existing = await prisma.investmentValue.findFirst({
    where: {
      investmentId: Number(investmentId),
      date: dateObj,
    },
  })

  let record
  if (existing) {
    record = await prisma.investmentValue.update({
      where: { id: existing.id },
      data: { value: String(value) },
    })
  } else {
    record = await prisma.investmentValue.create({
      data: {
        investmentId: Number(investmentId),
        date: dateObj,
        value: String(value),
      },
    })
  }

  return NextResponse.json(record, { status: 201 })
}
