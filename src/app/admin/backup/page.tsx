"use client"

import { useState } from "react"
import { Download } from "lucide-react"

export default function AdminBackupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDownload() {
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/backup")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Error al generar el backup")
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="(.+)"/)
      const filename = match ? match[1] : "nav_backup.db"

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Copias de seguridad</h1>

      {/* Backup manual */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-700">Backup manual</h2>
          <p className="text-sm text-slate-500 mt-1">
            Descarga una copia de la base de datos en este momento. El fichero contiene
            todos los usuarios, bancos, inversiones y valores históricos.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {loading ? "Generando..." : "Descargar backup"}
        </button>
      </div>

      {/* Backup automático */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
        <h2 className="text-base font-semibold text-slate-700">Backup automático (Docker)</h2>
        <p className="text-sm text-slate-500">
          Cuando la aplicación se ejecuta en Docker, se realiza automáticamente una copia
          de seguridad cada noche a las 02:00. Los backups se guardan en el volumen
          persistente <code className="bg-slate-100 px-1 rounded text-xs">/data/backups/</code> y
          se conservan durante los días configurados en <code className="bg-slate-100 px-1 rounded text-xs">BACKUP_KEEP_DAYS</code> (por defecto: 7).
        </p>
        <p className="text-sm text-slate-500">
          Para restaurar un backup, consulta las instrucciones en el README del proyecto.
        </p>
      </div>
    </div>
  )
}
