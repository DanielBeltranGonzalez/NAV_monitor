import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ValueTable } from '@/components/ValueTable'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ValuesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) notFound()

  const investment = await prisma.investment.findUnique({
    where: { id },
    include: {
      bank: true,
      values: { orderBy: { date: 'desc' } },
    },
  })

  if (!investment) notFound()

  const values = investment.values.map((v) => ({
    id: v.id,
    date: v.date.toISOString(),
    value: String(v.value),
  }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/investments">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{investment.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {investment.bank.name} · {values.length} valor{values.length !== 1 ? 'es' : ''}
          </p>
        </div>
      </div>
      <ValueTable investmentId={id} values={values} />
    </div>
  )
}
