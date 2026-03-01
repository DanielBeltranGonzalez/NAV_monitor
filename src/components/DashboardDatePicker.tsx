'use client'

import { useRouter } from 'next/navigation'

interface DashboardDatePickerProps {
  value: string
  max: string
}

export function DashboardDatePicker({ value, max }: DashboardDatePickerProps) {
  const router = useRouter()

  return (
    <input
      type="date"
      value={value}
      max={max}
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/dashboard?date=${e.target.value}`)
        }
      }}
      className="border border-input rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  )
}
