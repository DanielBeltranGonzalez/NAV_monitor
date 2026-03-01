import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { BankTable } from '@/components/BankTable'
import { PlusCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BanksPage() {
  const banks = await prisma.bank.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { investments: true } } },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bancos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {banks.length} banco{banks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/banks/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nuevo banco
          </Link>
        </Button>
      </div>
      <div className="rounded-md border bg-white">
        <BankTable banks={banks} />
      </div>
    </div>
  )
}
