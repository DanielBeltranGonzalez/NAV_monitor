import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const sinceRaw = searchParams.get('since')
  let sinceDate: Date | undefined
  if (sinceRaw) {
    const d = new Date(sinceRaw)
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'Parámetro since inválido' }, { status: 400 })
    sinceDate = d
  }

  const count = await prisma.auditLog.count({
    where: sinceDate ? { createdAt: { gt: sinceDate } } : undefined,
  })

  return NextResponse.json({ count })
}
