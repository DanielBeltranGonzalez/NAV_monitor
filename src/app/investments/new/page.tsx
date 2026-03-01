import { prisma } from '@/lib/prisma'
import { InvestmentForm } from '@/components/InvestmentForm'

export const dynamic = 'force-dynamic'

export default async function NewInvestmentPage() {
  const banks = await prisma.bank.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nueva inversión</h1>
      <InvestmentForm banks={banks} />
    </div>
  )
}
