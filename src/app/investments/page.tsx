import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { InvestmentTable } from '@/components/InvestmentTable'
import { PlusCircle } from 'lucide-react'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function InvestmentsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload) redirect('/auth/login')
  const userId = Number(payload.sub)

  const [investments, banks] = await Promise.all([
    prisma.investment.findMany({
      where: { userId },
      orderBy: [{ bank: { name: 'asc' } }, { name: 'asc' }],
      include: {
        bank: true,
        values: { orderBy: { date: 'desc' }, take: 1 },
      },
    }),
    prisma.bank.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inversiones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {investments.length} inversión{investments.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/investments/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva inversión
          </Link>
        </Button>
      </div>
      <InvestmentTable
        investments={investments.map((inv) => ({
          ...inv,
          createdAt: inv.createdAt.toISOString(),
          values: inv.values.map((v) => ({
            ...v,
            date: v.date.toISOString(),
            value: String(v.value),
          })),
        }))}
        banks={banks}
      />
    </div>
  )
}
