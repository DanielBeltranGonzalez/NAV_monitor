import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { InvestmentTable } from '@/components/InvestmentTable'
import { PlusCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InvestmentsPage() {
  const [investments, banks] = await Promise.all([
    prisma.investment.findMany({
      orderBy: [{ bank: { name: 'asc' } }, { name: 'asc' }],
      include: {
        bank: true,
        values: { orderBy: { date: 'desc' }, take: 1 },
      },
    }),
    prisma.bank.findMany({ orderBy: { name: 'asc' } }),
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
      <InvestmentTable investments={investments as any} banks={banks} />
    </div>
  )
}
