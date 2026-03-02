import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const investments = await prisma.investment.findMany({
    where: { userId: user.id },
    orderBy: [{ bank: { name: 'asc' } }, { name: 'asc' }],
    include: {
      bank: { select: { name: true } },
      values: { orderBy: { date: 'desc' } },
    },
  })

  const rows: string[] = ['Banco,Inversión,Fecha,Valor']

  for (const inv of investments) {
    for (const val of inv.values) {
      const date = new Date(val.date).toISOString().slice(0, 10)
      const value = val.value.toString()
      rows.push(
        [escapeCSV(inv.bank.name), escapeCSV(inv.name), date, value].join(',')
      )
    }
  }

  const csv = rows.join('\n')
  const today = new Date().toISOString().slice(0, 10)
  const filename = `nav_export_${today}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
