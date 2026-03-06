import { formatEUR, formatDate, formatChangePercent } from '@/lib/formatters'

interface ValueSnapshot {
  id: number
  date: string
  value: string
}

interface DashboardRowProps {
  name: string
  bank: string
  comment?: string | null
  current: ValueSnapshot | null
  previous: ValueSnapshot | null
  prevMonth: ValueSnapshot | null
  prevYear: ValueSnapshot | null
}

function DiffCell({
  current,
  reference,
}: {
  current: ValueSnapshot | null
  reference: ValueSnapshot | null
}) {
  if (!current || !reference) {
    return <span className="text-muted-foreground">—</span>
  }

  const curr = parseFloat(current.value)
  const ref = parseFloat(reference.value)
  const diff = curr - ref
  const pct = ref !== 0 ? (diff / ref) * 100 : 0
  const colorClass = diff >= 0 ? 'text-emerald-600' : 'text-red-500'

  const days =
    (new Date(current.date).getTime() - new Date(reference.date).getTime()) /
    86_400_000
  const annualizedPct =
    days >= 1 && ref !== 0
      ? (Math.pow(1 + pct / 100, 365 / days) - 1) * 100
      : null

  return (
    <div className={`flex flex-col items-end gap-0.5 tabular-nums ${colorClass}`}>
      <span>
        {formatEUR(diff)}
        <span className="ml-2">{formatChangePercent(pct)}</span>
        {annualizedPct !== null && (
          <span className="ml-2">({formatChangePercent(annualizedPct)} anual)</span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{formatDate(reference.date)}</span>
    </div>
  )
}

export function DashboardRow({
  name,
  bank,
  comment,
  current,
  previous,
  prevMonth,
  prevYear,
}: DashboardRowProps) {
  return (
    <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <td className="px-4 py-1.5 font-medium">
        {name}
        {comment && (
          <span title={comment} className="ml-1.5 text-slate-400 cursor-help text-xs align-middle">ⓘ</span>
        )}
      </td>
      <td className="px-4 py-1.5 text-muted-foreground text-sm">{bank}</td>
      <td className="px-4 py-1.5 text-right tabular-nums font-semibold">
        {current ? formatEUR(parseFloat(current.value)) : '—'}
      </td>
      <td className="px-4 py-1.5 text-sm text-muted-foreground">
        {current ? formatDate(current.date) : '—'}
      </td>
      <td className="px-4 py-1.5 text-right text-sm">
        <DiffCell current={current} reference={previous} />
      </td>
      <td className="px-4 py-1.5 text-right text-sm">
        <DiffCell current={current} reference={prevMonth} />
      </td>
      <td className="px-4 py-1.5 text-right text-sm">
        <DiffCell current={current} reference={prevYear} />
      </td>
    </tr>
  )
}
