import { prisma } from '@/lib/prisma'
import { ValueForm } from '@/components/ValueForm'

export const dynamic = 'force-dynamic'

export default async function NewValuePage() {
  const investments = await prisma.investment.findMany({
    orderBy: [{ bank: { name: 'asc' } }, { name: 'asc' }],
    include: {
      bank: true,
      values: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  const data = investments.map((inv) => ({
    id: inv.id,
    name: inv.name,
    bank: inv.bank.name,
    lastValue: inv.values[0]
      ? { value: String(inv.values[0].value), date: inv.values[0].date.toISOString() }
      : null,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Registrar valores NAV</h1>
      <ValueForm investments={data} />
    </div>
  )
}
