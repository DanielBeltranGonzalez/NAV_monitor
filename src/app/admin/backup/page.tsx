"use client"

import { useRef, useState } from "react"
import { Download, Upload } from "lucide-react"

export default function AdminBackupPage() {
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadError, setDownloadError] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreError, setRestoreError] = useState("")
  const [restoreSuccess, setRestoreSuccess] = useState(false)

  async function handleDownload() {
    setDownloadError("")
    setDownloadLoading(true)
    try {
      const res = await fetch("/api/admin/backup")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDownloadError(data.error ?? "Error al generar el backup")
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
      setDownloadError("Error de conexión")
    } finally {
      setDownloadLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setConfirming(false)
    setRestoreError("")
    setRestoreSuccess(false)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handleRestore() {
    if (!selectedFile) return
    setRestoreLoading(true)
    setRestoreError("")
    setRestoreSuccess(false)
    try {
      const formData = new FormData()
      formData.append("backup", selectedFile)
      const res = await fetch("/api/admin/backup", { method: "POST", body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRestoreError(data.error ?? "Error al restaurar el backup")
        return
      }
      setRestoreSuccess(true)
      setSelectedFile(null)
      setConfirming(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch {
      setRestoreError("Error de conexión")
    } finally {
      setRestoreLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Copias de seguridad</h1>

      {/* Backup manual */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Backup manual</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Descarga una copia de la base de datos en este momento. El fichero contiene
            todos los usuarios, bancos, inversiones y valores históricos.
          </p>
        </div>
        {downloadError && <p className="text-sm text-red-600">{downloadError}</p>}
        <button
          onClick={handleDownload}
          disabled={downloadLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {downloadLoading ? "Generando..." : "Descargar backup"}
        </button>
      </div>

      {/* Restaurar backup */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Restaurar backup</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sube un fichero <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">.db</code> para
            reemplazar la base de datos actual. Esta acción es irreversible.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".db"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Seleccionar archivo
        </button>

        {selectedFile && !confirming && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {selectedFile.name} <span className="text-slate-400">({formatSize(selectedFile.size)})</span>
            </span>
            <button
              onClick={() => setConfirming(true)}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 transition-colors"
            >
              Restaurar
            </button>
          </div>
        )}

        {confirming && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              ¿Seguro que quieres restaurar este backup?
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Se reemplazará la base de datos actual con <strong>{selectedFile?.name}</strong>.
              Todos los cambios realizados después de ese backup se perderán permanentemente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRestore}
                disabled={restoreLoading}
                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoreLoading ? "Restaurando..." : "Confirmar restauración"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={restoreLoading}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {restoreError && <p className="text-sm text-red-600">{restoreError}</p>}
        {restoreSuccess && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            Backup restaurado correctamente
          </p>
        )}
      </div>

      {/* Backup automático */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-3">
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Backup automático (Docker)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cuando la aplicación se ejecuta en Docker, se realiza automáticamente una copia
          de seguridad cada noche a las 02:00. Los backups se guardan en el volumen
          persistente <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">/data/backups/</code> y
          se conservan durante los días configurados en <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">BACKUP_KEEP_DAYS</code> (por defecto: 7).
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Para restaurar un backup, consulta las instrucciones en el README del proyecto.
        </p>
      </div>
    </div>
  )
}
