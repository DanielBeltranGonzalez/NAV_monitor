"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Download, RefreshCw } from "lucide-react"

interface LogData {
  available: boolean
  lines: string[]
  total: number
  size: number
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminLogsPage() {
  const [data, setData] = useState<LogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs")
      if (!res.ok) throw new Error("Error al cargar logs")
      const json = await res.json() as LogData
      setData(json)
      setError("")
    } catch {
      setError("No se pudieron cargar los logs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchLogs, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchLogs])

  // Scroll al final cuando llegan nuevos logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [data?.lines])

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch("/api/admin/logs?download=1")
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "nav-monitor.log"
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Logs del servidor</h1>

      {loading && <p className="text-sm text-slate-400">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && data && !data.available && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Logs no disponibles</p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            Los logs del servidor solo están disponibles cuando la aplicación se ejecuta en Docker.
            En modo desarrollo los logs se muestran directamente en la terminal.
          </p>
        </div>
      )}

      {!loading && data?.available && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Descargando…" : "Descargar log completo"}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-actualizar (30s)
            </label>
            <span className="ml-auto text-xs text-slate-400">
              Mostrando últimas {data.lines.length} líneas de {data.total} · {formatSize(data.size)}
            </span>
          </div>

          {/* Log viewer */}
          <div className="bg-slate-950 rounded-lg border border-slate-700 overflow-hidden">
            <div className="h-[60vh] overflow-y-auto p-4 font-mono text-xs leading-5">
              {data.lines.length === 0 ? (
                <p className="text-slate-500">El fichero de log está vacío.</p>
              ) : (
                data.lines.map((line, i) => (
                  <div key={i} className="text-slate-300 whitespace-pre-wrap break-all hover:bg-slate-900 px-1 -mx-1 rounded">
                    {line}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
