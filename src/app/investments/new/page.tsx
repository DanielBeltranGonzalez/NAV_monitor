import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { InvestmentForm } from '@/components/InvestmentForm'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function NewInvestmentPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload) redirect('/auth/login')
  const userId = Number(payload.sub)

  const banks = await prisma.bank.findMany({ where: { userId }, orderBy: { name: 'asc' } })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nueva inversión</h1>
      <InvestmentForm banks={banks} />
    </div>
  )
}
