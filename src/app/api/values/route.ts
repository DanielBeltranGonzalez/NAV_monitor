import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const body = await request.json()
  const { investmentId, date, value } = body

  // Validate investmentId
  if (!Number.isInteger(investmentId) || investmentId <= 0) {
    return NextResponse.json({ error: 'investmentId must be a positive integer' }, { status: 400 })
  }

  // Validate date format YYYY-MM-DD
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 })
  }
  const dateObj = new Date(date + 'T00:00:00Z')
  if (isNaN(dateObj.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  // Validate value
  if (typeof value !== 'number' || !isFinite(value) || value < 0) {
    return NextResponse.json({ error: 'value must be a non-negative finite number' }, { status: 400 })
  }

  // Verify investment exists
  const investment = await prisma.investment.findUnique({ where: { id: investmentId } })
  if (!investment) {
    return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
  }

  const existing = await prisma.investmentValue.findFirst({
    where: { investmentId, date: dateObj },
  })

  let record
  if (existing) {
    record = await prisma.investmentValue.update({
      where: { id: existing.id },
      data: { value: String(value) },
    })
  } else {
    record = await prisma.investmentValue.create({
      data: { investmentId, date: dateObj, value: String(value) },
    })
  }

  return NextResponse.json(record, { status: 201 })
}
