import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ValueForm } from '@/components/ValueForm'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function NewValuePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload) redirect('/auth/login')
  const userId = Number(payload.sub)

  const investments = await prisma.investment.findMany({
    where: { userId },
    include: {
      bank: true,
      values: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  const locale = { sensitivity: 'base' } as const
  investments.sort((a, b) => {
    const bankCmp = a.bank.name.localeCompare(b.bank.name, undefined, locale)
    return bankCmp !== 0 ? bankCmp : a.name.localeCompare(b.name, undefined, locale)
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
