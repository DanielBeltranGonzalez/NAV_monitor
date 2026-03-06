import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardChart } from '@/components/DashboardChart'
import { DashboardView } from '@/components/DashboardView'
import { formatDate } from '@/lib/formatters'
import { prisma } from '@/lib/prisma'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface ValueSnapshot {
  id: number
  date: string
  value: string
}

interface InvestmentData {
  id: number
  name: string
  bank: string
  comment: string | null
  current: ValueSnapshot | null
  previous: ValueSnapshot | null
  prevMonth: ValueSnapshot | null
  prevYear: ValueSnapshot | null
}

type DiffResult = { diff: number; pct: number; days: number } | null

type GroupTotals = {
  currentTotal: number
  prev: DiffResult
  prevMonth: DiffResult
  prevYear: DiffResult
}

// Calcula los totales de un grupo de inversiones usando la misma lógica que el chart API:
// para cada fecha de referencia, suma el valor más reciente de CADA inversión
// en o antes de esa fecha (usando una fecha de referencia común para todo el grupo).
function computeGroupTotals(
  invs: { values: { date: Date; value: { toString(): string } }[] }[],
  selectedDateStr: string
): GroupTotals {
  const allDates = new Set<string>()
  for (const inv of invs) {
    for (const v of inv.values) {
      const d = new Date(v.date).toISOString().slice(0, 10)
      if (d <= selectedDateStr) allDates.add(d)
    }
  }

  const sorted = Array.from(allDates).sort()
  if (sorted.length === 0) return { currentTotal: 0, prev: null, prevMonth: null, prevYear: null }

  function totalAt(dateStr: string): number {
    let t = 0
    for (const inv of invs) {
      const latest = [...inv.values]
        .filter((v) => new Date(v.date).toISOString().slice(0, 10) <= dateStr)
        .pop()
      if (latest) t += Number(latest.value)
    }
    return Math.round(t * 100) / 100
  }

  const currentDateStr = sorted[sorted.length - 1]
  const currentTotal = totalAt(currentDateStr)
  const [currentYear, currentMonth] = currentDateStr.split('-').map(Number)

  const prevDate = sorted.length >= 2 ? sorted[sorted.length - 2] : null
  const prevMonthDate =
    [...sorted].reverse().find((d) => {
      const [y, m] = d.split('-').map(Number)
      return y < currentYear || (y === currentYear && m < currentMonth)
    }) ?? null
  const prevYearDate =
    [...sorted].reverse().find((d) => Number(d.split('-')[0]) < currentYear) ?? null

  function makeDiff(refDate: string | null): DiffResult {
    if (!refDate) return null
    const refTotal = totalAt(refDate)
    const diff = currentTotal - refTotal
    const pct = refTotal !== 0 ? (diff / refTotal) * 100 : 0
    const days =
      (new Date(currentDateStr).getTime() - new Date(refDate).getTime()) / 86_400_000
    return { diff, pct, days }
  }

  return {
    currentTotal,
    prev: makeDiff(prevDate),
    prevMonth: makeDiff(prevMonthDate),
    prevYear: makeDiff(prevYearDate),
  }
}

// Calcula los totales globales del portfolio y los subtotales por banco,
// usando la misma lógica que el chart API.
async function getChartTotals(userId: number, selectedDate: Date): Promise<
  GroupTotals & { bankSubtotals: Map<string, GroupTotals> }
> {
  const selectedDateStr = selectedDate.toISOString().slice(0, 10)

  const invs = await prisma.investment.findMany({
    where: { userId },
    select: {
      bank: { select: { name: true } },
      values: {
        select: { date: true, value: true },
        orderBy: { date: 'asc' },
      },
    },
  })

  const overall = computeGroupTotals(invs, selectedDateStr)

  // Subtotales por banco
  const bankMap = new Map<string, typeof invs>()
  for (const inv of invs) {
    const name = inv.bank.name
    if (!bankMap.has(name)) bankMap.set(name, [])
    bankMap.get(name)!.push(inv)
  }

  const bankSubtotals = new Map<string, GroupTotals>()
  for (const [bankName, bankInvs] of bankMap) {
    bankSubtotals.set(bankName, computeGroupTotals(bankInvs, selectedDateStr))
  }

  return { ...overall, bankSubtotals }
}


async function getDashboardData(userId: number, selectedDate: Date): Promise<InvestmentData[]> {
  const investments = await prisma.investment.findMany({
    where: { userId },
    orderBy: [{ bank: { name: 'asc' } }, { name: 'asc' }],
    include: {
      bank: true,
      values: {
        orderBy: { date: 'desc' },
      },
    },
  })

  return investments.flatMap((inv) => {
    const values = inv.values
    const currentIndex = values.findIndex((v) => new Date(v.date) <= selectedDate)
    const current = currentIndex >= 0 ? values[currentIndex] : null

    if (!current || Number(current.value) === 0) return []

    const currentDateMs = new Date(current.date).getTime()
    const previous =
      values.slice(currentIndex + 1).find(
        (v) => new Date(v.date).getTime() < currentDateMs
      ) ?? null

    const refDate = current ? new Date(current.date) : new Date()
    const refMonth = refDate.getUTCMonth()
    const refYear = refDate.getUTCFullYear()

    const prevMonth =
      values.find((v) => {
        const d = new Date(v.date)
        return (
          d.getUTCFullYear() < refYear ||
          (d.getUTCFullYear() === refYear && d.getUTCMonth() < refMonth)
        )
      }) ?? null

    const prevYear =
      values.find((v) => new Date(v.date).getUTCFullYear() < refYear) ?? null

    return {
      id: inv.id,
      name: inv.name,
      bank: inv.bank.name,
      comment: inv.comment,
      current: current
        ? { id: current.id, date: current.date.toISOString(), value: String(current.value) }
        : null,
      previous: previous
        ? { id: previous.id, date: previous.date.toISOString(), value: String(previous.value) }
        : null,
      prevMonth: prevMonth
        ? { id: prevMonth.id, date: prevMonth.date.toISOString(), value: String(prevMonth.value) }
        : null,
      prevYear: prevYear
        ? { id: prevYear.id, date: prevYear.date.toISOString(), value: String(prevYear.value) }
        : null,
    }
  })
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload) redirect('/auth/login')
  const userId = Number(payload.sub)

  const params = await searchParams

  const latestValue = await prisma.investmentValue.findFirst({
    where: { investment: { userId } },
    orderBy: { date: 'desc' },
    select: { date: true },
  })

  const maxDateStr = latestValue
    ? latestValue.date.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  const selectedDateStr = params.date ?? maxDateStr
  const selectedDate = new Date(`${selectedDateStr}T23:59:59.999Z`)

  const [investments, chartTotals] = await Promise.all([
    getDashboardData(userId, selectedDate),
    getChartTotals(userId, selectedDate),
  ])

  const newestDate = investments.reduce<string>((best, inv) => {
    const d = inv.current!.date.slice(0, 10)
    return d > best ? d : best
  }, '')
  const dateOutliers = investments.filter(
    (inv) => inv.current!.date.slice(0, 10) !== newestDate
  )

  const bankGroups: Map<string, InvestmentData[]> = new Map()
  for (const inv of investments) {
    if (!bankGroups.has(inv.bank)) bankGroups.set(inv.bank, [])
    bankGroups.get(inv.bank)!.push(inv)
  }

  const emptyTotals: GroupTotals = { currentTotal: 0, prev: null, prevMonth: null, prevYear: null }

  return (
    <div>
      {dateOutliers.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-1">
            ⚠ Los siguientes valores no son de la fecha más reciente ({formatDate(newestDate)}):
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            {dateOutliers.map((inv) => (
              <li key={inv.id}>
                <span className="font-medium">{inv.name}</span>
                {' '}({inv.bank})
                {' '}— {formatDate(inv.current!.date)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No investments yet. Add some from the Investments section.
        </div>
      ) : (
        <div>
          <DashboardView
            dateValue={selectedDateStr}
            dateMax={maxDateStr}
            bankGroups={Array.from(bankGroups.entries())
              .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
              .map(([bank, investments]) => ({
                bank,
                investments,
                subtotals: chartTotals.bankSubtotals.get(bank) ?? emptyTotals,
              }))}
            chartTotals={chartTotals}
          />
          <DashboardChart />
        </div>
      )}
    </div>
  )
}
