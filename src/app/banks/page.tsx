import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { BankTable } from '@/components/BankTable'
import { PlusCircle } from 'lucide-react'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function BanksPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload) redirect('/auth/login')
  const userId = Number(payload.sub)

  const banks = await prisma.bank.findMany({
    where: { userId },
    include: { _count: { select: { investments: true } } },
  })
  banks.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

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
      <div className="rounded-md border bg-white dark:bg-slate-900">
        <BankTable banks={banks} />
      </div>
    </div>
  )
}
