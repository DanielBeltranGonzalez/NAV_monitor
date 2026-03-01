"use client"

import { useEffect, useState } from "react"
import { EVENT_LABELS, AuditEvent } from "@/lib/audit"
import { formatDate } from "@/lib/formatters"

interface AuditLogRow {
  id: number
  event: AuditEvent
  userEmail: string
  targetEmail: string | null
  createdAt: string
}

const EVENT_COLORS: Record<AuditEvent, string> = {
  USER_REGISTERED:  "bg-emerald-100 text-emerald-800",
  USER_LOGIN:       "bg-slate-100 text-slate-600",
  PASSWORD_CHANGED: "bg-blue-100 text-blue-800",
  PASSWORD_RESET:   "bg-amber-100 text-amber-800",
  ACCOUNT_DELETED:  "bg-red-100 text-red-800",
  ROLE_CHANGED:     "bg-purple-100 text-purple-800",
}

const EVENTS_LAST_READ_KEY = "eventsLastRead"

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    localStorage.setItem(EVENTS_LAST_READ_KEY, new Date().toISOString())
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Cargando...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Registro de eventos</h1>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Evento</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Usuario</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Afectado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString("es-ES", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${EVENT_COLORS[e.event] ?? "bg-slate-100 text-slate-600"}`}>
                    {EVENT_LABELS[e.event] ?? e.event}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{e.userEmail}</td>
                <td className="px-4 py-3 text-slate-500">{e.targetEmail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="text-center py-12 text-slate-400">No hay eventos registrados.</div>
        )}
      </div>
    </div>
  )
}
