import { Fragment } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardRow } from '@/components/DashboardCard'
import { DashboardChart } from '@/components/DashboardChart'
import { DashboardDatePicker } from '@/components/DashboardDatePicker'
import { formatEUR, formatChangePercent, formatDate } from '@/lib/formatters'
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
  current: ValueSnapshot | null
  previous: ValueSnapshot | null
  prevMonth: ValueSnapshot | null
  prevYear: ValueSnapshot | null
}

type DiffResult = { diff: number; pct: number; days: number } | null

function sumDiff(
  investments: InvestmentData[],
  key: 'previous' | 'prevMonth' | 'prevYear'
): DiffResult {
  let sumCurrent = 0
  let sumRef = 0
  let totalDays = 0
  let count = 0
  for (const inv of investments) {
    if (!inv.current || !inv[key]) continue
    sumCurrent += parseFloat(inv.current.value)
    sumRef += parseFloat(inv[key]!.value)
    totalDays +=
      (new Date(inv.current.date).getTime() - new Date(inv[key]!.date).getTime()) /
      86_400_000
    count++
  }
  if (count === 0) return null
  const pct = sumRef !== 0 ? ((sumCurrent - sumRef) / sumRef) * 100 : 0
  return { diff: sumCurrent - sumRef, pct, days: totalDays / count }
}

// Calcula los totales del portfolio usando la misma lógica que el chart API:
// para cada fecha de referencia, suma el valor más reciente de CADA inversión
// en o antes de esa fecha (incluyendo inversiones ahora cerradas).
async function getChartTotals(userId: number, selectedDate: Date): Promise<{
  currentTotal: number
  prev: DiffResult
  prevMonth: DiffResult
  prevYear: DiffResult
}> {
  const selectedDateStr = selectedDate.toISOString().slice(0, 10)

  const invs = await prisma.investment.findMany({
    where: { userId },
    select: {
      values: {
        select: { date: true, value: true },
        orderBy: { date: 'asc' },
      },
    },
  })

  // Todas las fechas únicas con valores en o antes de la fecha seleccionada
  const allDates = new Set<string>()
  for (const inv of invs) {
    for (const v of inv.values) {
      const d = new Date(v.date).toISOString().slice(0, 10)
      if (d <= selectedDateStr) allDates.add(d)
    }
  }

  const sorted = Array.from(allDates).sort()
  if (sorted.length === 0) return { currentTotal: 0, prev: null, prevMonth: null, prevYear: null }

  // Total del portfolio en una fecha dada (igual que el chart)
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

  // Fecha anterior: el punto inmediatamente anterior en el chart
  const prevDate = sorted.length >= 2 ? sorted[sorted.length - 2] : null

  // Fecha mes anterior: el punto más reciente en un mes anterior
  const prevMonthDate =
    [...sorted].reverse().find((d) => {
      const [y, m] = d.split('-').map(Number)
      return y < currentYear || (y === currentYear && m < currentMonth)
    }) ?? null

  // Fecha año anterior: el punto más reciente en un año anterior
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

function DiffSumCell({ result }: { result: DiffResult }) {
  if (result === null) return <span className="text-muted-foreground">—</span>
  const colorClass = result.diff >= 0 ? 'text-emerald-600' : 'text-red-500'
  const annualizedPct =
    result.days >= 1 && result.pct !== 0
      ? (Math.pow(1 + result.pct / 100, 365 / result.days) - 1) * 100
      : null
  return (
    <span className={`tabular-nums font-semibold ${colorClass}`}>
      {formatEUR(result.diff)}
      <span className="ml-2">{formatChangePercent(result.pct)}</span>
      {annualizedPct !== null && (
        <span className="ml-2">({formatChangePercent(annualizedPct)} anual)</span>
      )}
    </span>
  )
}

function SubtotalRow({ bank, investments }: { bank: string; investments: InvestmentData[] }) {
  const nav = investments.reduce((s, inv) => s + (inv.current ? parseFloat(inv.current.value) : 0), 0)
  const diffPrev = sumDiff(investments, 'previous')
  const diffMonth = sumDiff(investments, 'prevMonth')
  const diffYear = sumDiff(investments, 'prevYear')

  return (
    <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-300 dark:border-slate-600">
      <td className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-200" colSpan={2}>
        Subtotal — {bank}
      </td>
      <td className="px-4 py-2 text-right tabular-nums font-bold text-slate-800 dark:text-slate-100">
        {formatEUR(nav)}
      </td>
      <td className="px-4 py-2" />
      <td className="px-4 py-2 text-right text-sm"><DiffSumCell result={diffPrev} /></td>
      <td className="px-4 py-2 text-right text-sm"><DiffSumCell result={diffMonth} /></td>
      <td className="px-4 py-2 text-right text-sm"><DiffSumCell result={diffYear} /></td>
    </tr>
  )
}

function TotalRow({
  chartTotals,
}: {
  chartTotals: Awaited<ReturnType<typeof getChartTotals>>
}) {
  return (
    <tr className="bg-slate-800 dark:bg-slate-950 text-white">
      <td className="px-4 py-3 font-bold" colSpan={2}>
        Total portfolio
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-bold text-lg">
        {formatEUR(chartTotals.currentTotal)}
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3 text-right text-sm">
        <DiffSumCell result={chartTotals.prev} />
      </td>
      <td className="px-4 py-3 text-right text-sm">
        <DiffSumCell result={chartTotals.prevMonth} />
      </td>
      <td className="px-4 py-3 text-right text-sm">
        <DiffSumCell result={chartTotals.prevYear} />
      </td>
    </tr>
  )
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DashboardDatePicker value={selectedDateStr} max={maxDateStr} />
      </div>

      {dateOutliers.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
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
          <div className="rounded-md border bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Inversión</th>
                <th className="px-4 py-3 text-left font-medium">Banco</th>
                <th className="px-4 py-3 text-right font-medium">NAV actual</th>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-right font-medium">vs Anterior</th>
                <th className="px-4 py-3 text-right font-medium">vs Mes ant.</th>
                <th className="px-4 py-3 text-right font-medium">vs Año ant.</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(bankGroups.entries()).map(([bank, rows]) => (
                <Fragment key={bank}>
                  {rows.map((inv) => (
                    <DashboardRow
                      key={inv.id}
                      name={inv.name}
                      bank={inv.bank}
                      current={inv.current}
                      previous={inv.previous}
                      prevMonth={inv.prevMonth}
                      prevYear={inv.prevYear}
                    />
                  ))}
                  {bankGroups.size > 1 && (
                    <SubtotalRow bank={bank} investments={rows} />
                  )}
                </Fragment>
              ))}
              <TotalRow chartTotals={chartTotals} />
            </tbody>
          </table>
          </div>
          <DashboardChart />
        </div>
      )}
    </div>
  )
}
