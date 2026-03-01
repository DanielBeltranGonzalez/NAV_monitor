import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const record = await prisma.investmentValue.findUnique({
    where: { id },
    include: { investment: true },
  })
  if (!record) return NextResponse.json({ error: 'Value not found' }, { status: 404 })
  if (record.investment.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { date, value } = body
  const data: { date?: Date; value?: string } = {}

  if (date !== undefined) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 })
    }
    const dateObj = new Date(date + 'T00:00:00Z')
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    data.date = dateObj
  }

  if (value !== undefined) {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) {
      return NextResponse.json({ error: 'value must be a non-negative finite number' }, { status: 400 })
    }
    data.value = String(value)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.investmentValue.update({ where: { id }, data })
  return NextResponse.json({
    id: updated.id,
    date: updated.date.toISOString(),
    value: String(updated.value),
  })
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

  const record = await prisma.investmentValue.findUnique({
    where: { id },
    include: { investment: true },
  })
  if (!record) return NextResponse.json({ error: 'Value not found' }, { status: 404 })
  if (record.investment.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.investmentValue.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
