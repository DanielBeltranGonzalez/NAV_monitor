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
  ROLE_CHANGED:        "bg-purple-100 text-purple-800",
  BACKUP_DOWNLOADED:   "bg-gray-100 text-gray-700",
  BACKUP_RESTORED:     "bg-orange-100 text-orange-800",
  BACKUP_SYNC:         "bg-cyan-100 text-cyan-800",
  LOGS_DOWNLOADED:     "bg-gray-100 text-gray-600",
}

const EVENTS_LAST_READ_KEY = "eventsLastRead"

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRead, setLastRead] = useState<Date | null>(null)

  useEffect(() => {
    const prev = localStorage.getItem(EVENTS_LAST_READ_KEY)
    setLastRead(prev ? new Date(prev) : null)
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
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Registro de eventos</h1>
        {(() => {
          const unread = events.filter(e => lastRead === null || new Date(e.createdAt) > lastRead).length
          return unread > 0 ? (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unread} sin leer
            </span>
          ) : null
        })()}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Fecha</th>
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Evento</th>
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Usuario</th>
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Afectado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {events.map((e) => {
              const isNew = lastRead === null || new Date(e.createdAt) > lastRead
              return (
                <tr key={e.id} className={isNew ? "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"}>
                  <td className="px-4 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isNew && (
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" title="Sin leer" />
                      )}
                      <span className={isNew ? "text-slate-800 dark:text-slate-100 font-medium" : "text-slate-500 dark:text-slate-400"}>
                        {new Date(e.createdAt).toLocaleString("es-ES", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${EVENT_COLORS[e.event] ?? "bg-slate-100 text-slate-600"}`}>
                      {EVENT_LABELS[e.event] ?? e.event}
                    </span>
                  </td>
                  <td className={`px-4 py-1.5 ${isNew ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-700 dark:text-slate-300"}`}>{e.userEmail}</td>
                  <td className="px-4 py-1.5 text-slate-500 dark:text-slate-400">{e.targetEmail ?? "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="text-center py-12 text-slate-400">No hay eventos registrados.</div>
        )}
      </div>
    </div>
  )
}
