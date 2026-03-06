'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatEUR, formatDate } from '@/lib/formatters'

interface LastValue {
  value: string
  date: string
}

interface Investment {
  id: number
  name: string
  bank: string
  lastValue: LastValue | null
}

interface ValueFormProps {
  investments: Investment[]
}

export function ValueForm({ investments }: ValueFormProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [values, setValues] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState<number | null>(null)

  function handleValueChange(id: number, val: string) {
    setValues((prev) => ({ ...prev, [id]: val }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)

    const entries = Object.entries(values).filter(([, v]) => v.trim() !== '')
    if (entries.length === 0) {
      setError('Introduce al menos un valor.')
      return
    }

    setLoading(true)
    const results = await Promise.all(
      entries.map(([id, val]) =>
        fetch('/api/values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            investmentId: Number(id),
            date,
            value: parseFloat(val),
          }),
        })
      )
    )

    const failed = results.filter((r) => !r.ok)
    if (failed.length > 0) {
      setError(`${failed.length} valor(es) no se pudieron guardar.`)
    } else {
      setSaved(true)
    }
    setLoading(false)
  }

  if (investments.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay inversiones. Crea una primero.
      </p>
    )
  }

  const active = investments.filter((inv) => !inv.lastValue || parseFloat(inv.lastValue.value) !== 0)
  const inactive = investments.filter((inv) => inv.lastValue && parseFloat(inv.lastValue.value) === 0)

  function toGroups(list: Investment[]) {
    return list.reduce<Record<string, Investment[]>>((acc, inv) => {
      if (!acc[inv.bank]) acc[inv.bank] = []
      acc[inv.bank].push(inv)
      return acc
    }, {})
  }

  function renderTable(list: Investment[]) {
    const groups = toGroups(list)
    return (
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col />
          <col className="w-36" />
          <col className="w-36" />
          <col className="w-48" />
        </colgroup>
        <thead>
          <tr className="border-b bg-slate-50 dark:bg-slate-800 text-muted-foreground">
            <th className="px-4 py-1.5 text-left font-medium">Inversión</th>
            <th className="px-4 py-1.5 text-right font-medium">Último valor</th>
            <th className="px-4 py-1.5 text-right font-medium">Última fecha</th>
            <th className="px-4 py-1.5 text-right font-medium">NAV (€)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groups).map(([bank, rows]) => (
            <Fragment key={bank}>
              <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-600">
                <td colSpan={4} className="px-4 py-1 text-xs text-muted-foreground font-medium">
                  {bank}
                </td>
              </tr>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className={`px-4 py-2 font-medium transition-colors ${focused === inv.id ? 'text-blue-600' : ''}`}>{inv.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {inv.lastValue ? formatEUR(parseFloat(inv.lastValue.value)) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {inv.lastValue ? formatDate(inv.lastValue.date) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={values[inv.id] ?? ''}
                      onChange={(e) => handleValueChange(inv.id, e.target.value)}
                      onFocus={() => setFocused(inv.id)}
                      onBlur={() => setFocused(null)}
                      className="w-40 text-right ml-auto"
                    />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    )
  }

  const filledCount = Object.values(values).filter((v) => v.trim() !== '').length

  return (
    <form onSubmit={handleSubmit}>
      {/* Date picker */}
      <div className="flex items-center gap-4 mb-6">
        <Label htmlFor="date" className="text-sm font-medium whitespace-nowrap">
          Fecha
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setSaved(false) }}
          className="w-44"
          required
        />
      </div>

      {/* Active table */}
      <div className="rounded-md border bg-white dark:bg-slate-900 overflow-x-auto mb-4">
        {renderTable(active)}
      </div>

      {/* Inactive table (NAV = 0) */}
      {inactive.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground px-1 pb-2">NAV = 0</h2>
          <div className="rounded-md border bg-white dark:bg-slate-900 overflow-x-auto opacity-60">
            {renderTable(inactive)}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando…' : `Guardar${filledCount > 0 ? ` (${filledCount})` : ''}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Ver Dashboard
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">
            ✓ Guardado correctamente
          </span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  )
}
