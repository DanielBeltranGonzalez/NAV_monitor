import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  const user = await getSessionUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const investments = await prisma.investment.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
    include: {
      bank: true,
      values: {
        orderBy: { date: 'desc' },
      },
    },
  })

  const result = investments.map((inv) => {
    const values = inv.values // already sorted DESC by date

    const current = values[0] ?? null
    const previous = values[1] ?? null

    // Reference date: current value's date (or today)
    const refDate = current ? new Date(current.date) : new Date()
    const refMonth = refDate.getUTCMonth()
    const refYear = refDate.getUTCFullYear()

    // prevMonth: most recent value where month < refMonth (same year) or year < refYear
    const prevMonth =
      values.find((v) => {
        const d = new Date(v.date)
        const m = d.getUTCMonth()
        const y = d.getUTCFullYear()
        return y < refYear || (y === refYear && m < refMonth)
      }) ?? null

    // prevYear: most recent value where year < refYear
    const prevYear =
      values.find((v) => {
        const d = new Date(v.date)
        return d.getUTCFullYear() < refYear
      }) ?? null

    return {
      id: inv.id,
      name: inv.name,
      bank: inv.bank.name,
      current,
      previous,
      prevMonth,
      prevYear,
    }
  })

  return NextResponse.json(result.filter((r) => r.current && Number(r.current.value) !== 0))
}
