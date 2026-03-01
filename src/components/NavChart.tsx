"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface DataPoint {
  date: string
  total: number
}

function formatEURShort(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M€`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K€`
  return `${value}€`
}

function formatDate(dateStr: string) {
  const [year, month] = dateStr.split("-")
  return `${month}/${year.slice(2)}`
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow text-sm">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className="font-semibold text-slate-800">
        {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(payload[0].value)}
      </p>
    </div>
  )
}

export function NavChart({ data }: { data: DataPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        Se necesitan al menos 2 registros para mostrar el gráfico.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={formatEURShort}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#navGradient)"
          dot={data.length <= 20}
          activeDot={{ r: 4, fill: "#10b981" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
