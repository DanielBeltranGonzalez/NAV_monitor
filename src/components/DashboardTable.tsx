import { DashboardRow } from "@/components/DashboardCard"
import { formatEUR, formatChangePercent } from "@/lib/formatters"

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

interface GroupTotals {
  currentTotal: number
  prev: DiffResult
  prevMonth: DiffResult
  prevYear: DiffResult
}

interface BankGroup {
  bank: string
  investments: InvestmentData[]
  subtotals: GroupTotals
}

interface DashboardTableProps {
  bankGroups: BankGroup[]
  chartTotals: GroupTotals
  summary: boolean
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

function SubtotalRow({ bank, nav, subtotals }: { bank: string; nav: number; subtotals: GroupTotals }) {
  return (
    <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-300 dark:border-slate-600">
      <td className="px-4 py-1 font-semibold text-slate-700 dark:text-slate-200" colSpan={2}>
        Subtotal — {bank}
      </td>
      <td className="px-4 py-1 text-right tabular-nums font-bold text-slate-800 dark:text-slate-100">
        {formatEUR(nav)}
      </td>
      <td className="px-4 py-1" />
      <td className="px-4 py-1 text-right text-sm"><DiffSumCell result={subtotals.prev} /></td>
      <td className="px-4 py-1 text-right text-sm"><DiffSumCell result={subtotals.prevMonth} /></td>
      <td className="px-4 py-1 text-right text-sm"><DiffSumCell result={subtotals.prevYear} /></td>
    </tr>
  )
}

function TotalRow({ chartTotals }: { chartTotals: GroupTotals }) {
  return (
    <tr className="bg-slate-800 dark:bg-slate-950 text-white">
      <td className="px-4 py-1.5 font-bold" colSpan={2}>
        Total portfolio
      </td>
      <td className="px-4 py-1.5 text-right tabular-nums font-bold text-lg">
        {formatEUR(chartTotals.currentTotal)}
      </td>
      <td className="px-4 py-1.5" />
      <td className="px-4 py-1.5 text-right text-sm">
        <DiffSumCell result={chartTotals.prev} />
      </td>
      <td className="px-4 py-1.5 text-right text-sm">
        <DiffSumCell result={chartTotals.prevMonth} />
      </td>
      <td className="px-4 py-1.5 text-right text-sm">
        <DiffSumCell result={chartTotals.prevYear} />
      </td>
    </tr>
  )
}

export function DashboardTable({ bankGroups, chartTotals, summary }: DashboardTableProps) {
  return (
    <div className="rounded-md border bg-white dark:bg-slate-900 overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-1.5 text-left font-medium sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">Inversión</th>
              <th className="px-4 py-1.5 text-left font-medium sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">Banco</th>
              <th className="px-4 py-1.5 text-right font-medium sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">NAV actual</th>
              <th className="px-4 py-1.5 text-left font-medium sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">Fecha</th>
              <th className="px-4 py-1.5 text-right font-medium sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">vs Anterior</th>
              <th className="px-4 py-1.5 text-right font-medium sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">vs Mes ant.</th>
              <th className="px-4 py-1.5 text-right font-medium sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">vs Año ant.</th>
            </tr>
          </thead>
          <tbody>
            {bankGroups.map(({ bank, investments, subtotals }) => (
              <>
                {!summary && investments.map((inv) => (
                  <DashboardRow
                    key={inv.id}
                    name={inv.name}
                    bank={inv.bank}
                    comment={inv.comment}
                    current={inv.current}
                    previous={inv.previous}
                    prevMonth={inv.prevMonth}
                    prevYear={inv.prevYear}
                  />
                ))}
                {bankGroups.length > 1 && (
                  <SubtotalRow
                    bank={bank}
                    nav={investments.reduce((s, inv) => s + (inv.current ? parseFloat(inv.current.value) : 0), 0)}
                    subtotals={subtotals}
                  />
                )}
              </>
            ))}
            <TotalRow chartTotals={chartTotals} />
          </tbody>
        </table>
      </div>
  )
}
