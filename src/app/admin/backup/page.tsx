"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Download, Upload } from "lucide-react"

interface BackupFile {
  name: string
  size: number
  createdAt: string
}

export default function AdminBackupPage() {
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadError, setDownloadError] = useState("")

  const [backups, setBackups] = useState<BackupFile[]>([])
  const [backupsLoading, setBackupsLoading] = useState(true)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)
  const [confirmingServerRestore, setConfirmingServerRestore] = useState<string | null>(null)
  const [serverRestoreLoading, setServerRestoreLoading] = useState(false)
  const [serverRestoreError, setServerRestoreError] = useState("")
  const [serverRestoreSuccess, setServerRestoreSuccess] = useState(false)

  const loadBackups = useCallback(() => {
    setBackupsLoading(true)
    fetch("/api/admin/backup/list")
      .then((r) => r.json())
      .then((d) => setBackups(Array.isArray(d) ? d : []))
      .catch(() => setBackups([]))
      .finally(() => setBackupsLoading(false))
  }, [])

  useEffect(() => { loadBackups() }, [loadBackups])

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

  async function handleServerRestore(filename: string) {
    setServerRestoreLoading(true)
    setServerRestoreError("")
    setServerRestoreSuccess(false)
    try {
      const res = await fetch(`/api/admin/backup/files/${encodeURIComponent(filename)}`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setServerRestoreError(data.error ?? "Error al restaurar el backup")
        return
      }
      setServerRestoreSuccess(true)
      setConfirmingServerRestore(null)
    } catch {
      setServerRestoreError("Error de conexión")
    } finally {
      setServerRestoreLoading(false)
    }
  }

  async function handleDownloadFile(filename: string) {
    setDownloadingFile(filename)
    try {
      const res = await fetch(`/api/admin/backup/files/${encodeURIComponent(filename)}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingFile(null)
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Parsea "nav_20260306_020000.db" → "06/03/2026 02:00"
  function formatBackupName(name: string) {
    const m = name.match(/nav_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/)
    if (!m) return name
    return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`
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

      {/* Backups guardados */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Backups guardados</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Copias generadas automáticamente y almacenadas en el servidor.
            </p>
          </div>
          <button
            onClick={loadBackups}
            disabled={backupsLoading}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
          >
            Actualizar
          </button>
        </div>

        {serverRestoreError && <p className="text-sm text-red-600">{serverRestoreError}</p>}
        {serverRestoreSuccess && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            Backup restaurado correctamente
          </p>
        )}

        {backupsLoading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : backups.length === 0 ? (
          <p className="text-sm text-slate-400">No hay backups guardados en el servidor.</p>
        ) : (
          <div className="space-y-2">
            <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Fecha</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Tamaño</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {backups.map((b) => (
                    <tr key={b.name} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-xs">
                        {formatBackupName(b.name)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatSize(b.size)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => {
                              setConfirmingServerRestore(b.name)
                              setServerRestoreError("")
                              setServerRestoreSuccess(false)
                            }}
                            disabled={serverRestoreLoading}
                            className="px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-40"
                          >
                            Restaurar
                          </button>
                          <button
                            onClick={() => handleDownloadFile(b.name)}
                            disabled={downloadingFile === b.name}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
                          >
                            <Download className="h-3 w-3" />
                            {downloadingFile === b.name ? "…" : "Descargar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {confirmingServerRestore && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  ¿Seguro que quieres restaurar este backup?
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Se reemplazará la base de datos actual con{" "}
                  <strong>{formatBackupName(confirmingServerRestore)}</strong>.
                  Todos los cambios realizados después de ese backup se perderán permanentemente.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleServerRestore(confirmingServerRestore)}
                    disabled={serverRestoreLoading}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {serverRestoreLoading ? "Restaurando..." : "Confirmar restauración"}
                  </button>
                  <button
                    onClick={() => setConfirmingServerRestore(null)}
                    disabled={serverRestoreLoading}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
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
