import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Obtener todas las inversiones del usuario con todos sus valores
  const investments = await prisma.investment.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      values: {
        select: { date: true, value: true },
        orderBy: { date: 'asc' },
      },
    },
  })

  if (investments.length === 0) return NextResponse.json([])

  // Recoger todas las fechas únicas (como ISO date string YYYY-MM-DD)
  const allDates = new Set<string>()
  for (const inv of investments) {
    for (const v of inv.values) {
      allDates.add(new Date(v.date).toISOString().slice(0, 10))
    }
  }

  const sortedDates = Array.from(allDates).sort()

  // Para cada fecha, sumar el valor más reciente de cada inversión hasta esa fecha
  const result = sortedDates.map((dateStr) => {
    let total = 0
    for (const inv of investments) {
      // Valor más reciente de esta inversión en o antes de dateStr
      const latest = [...inv.values]
        .filter((v) => new Date(v.date).toISOString().slice(0, 10) <= dateStr)
        .pop()
      if (latest) total += Number(latest.value)
    }
    return { date: dateStr, total: Math.round(total * 100) / 100 }
  })

  return NextResponse.json(result)
}
