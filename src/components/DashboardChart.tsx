"use client"

import { useEffect, useState } from "react"
import { NavChart } from "@/components/NavChart"

interface DataPoint {
  date: string
  total: number
}

export function DashboardChart() {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/values/chart")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (data.length < 2) return null

  return (
    <div className="bg-white rounded-md border mt-6 p-4">
      <h2 className="text-sm font-semibold text-slate-600 mb-4">Evolución del portfolio</h2>
      <NavChart data={data} />
    </div>
  )
}
