"use client"

import { useState } from "react"
import { DashboardDatePicker } from "@/components/DashboardDatePicker"
import { DashboardTable } from "@/components/DashboardTable"
import { DashboardChart } from "@/components/DashboardChart"

type DiffResult = { diff: number; pct: number; days: number } | null

interface GroupTotals {
  currentTotal: number
  prev: DiffResult
  prevMonth: DiffResult
  prevYear: DiffResult
}

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

interface BankGroup {
  bank: string
  investments: InvestmentData[]
  subtotals: GroupTotals
}

interface DashboardViewProps {
  dateValue: string
  dateMax: string
  bankGroups: BankGroup[]
  chartTotals: GroupTotals
}

export function DashboardView({ dateValue, dateMax, bankGroups, chartTotals }: DashboardViewProps) {
  const [summary, setSummary] = useState(true)

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSummary(!summary)}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {summary ? "Vista completa" : "Vista resumen"}
          </button>
          <DashboardDatePicker value={dateValue} max={dateMax} />
        </div>
      </div>
      <DashboardTable bankGroups={bankGroups} chartTotals={chartTotals} summary={summary} />
      {summary && <DashboardChart />}
    </>
  )
}
