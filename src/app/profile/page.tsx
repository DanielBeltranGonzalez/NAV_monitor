"use client"

import { useEffect, useState } from "react"
import { Download, Eye, EyeOff } from "lucide-react"

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState("")

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // Exportar CSV
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState("")

  // Eliminar cuenta
  const [confirm, setConfirm] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (data.email) setUserEmail(data.email) })
  }, [])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError("")
    setPwSuccess(false)
    setPwLoading(true)
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        setPwSuccess(true)
        setCurrentPassword("")
        setNewPassword("")
      } else {
        const data = await res.json().catch(() => ({}))
        setPwError(data.error ?? "Error al cambiar la contraseña")
      }
    } catch {
      setPwError("Error de conexión")
    } finally {
      setPwLoading(false)
    }
  }

  async function handleExport() {
    setExportError("")
    setExportLoading(true)
    try {
      const res = await fetch("/api/export/csv")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setExportError(data.error ?? "Error al generar el CSV")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const today = new Date().toISOString().slice(0, 10)
      a.download = `nav_export_${today}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError("Error de conexión")
    } finally {
      setExportLoading(false)
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (confirm !== userEmail) {
      setDeleteError("El email no coincide")
      return
    }
    setDeleteError("")
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/auth/me", { method: "DELETE" })
      if (res.ok) {
        window.location.href = "/auth/login"
      } else {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? "Error al eliminar la cuenta")
      }
    } catch {
      setDeleteError("Error de conexión")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mi perfil</h1>

      {/* Cambio de contraseña */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="currentPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Contraseña actual
            </label>
            <div className="flex items-center gap-2">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPwError(""); setPwSuccess(false) }}
                className="flex h-10 w-full rounded-md border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-emerald-500 dark:focus-visible:border-emerald-400 disabled:opacity-50"
                required
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="text-slate-400 hover:text-slate-600 shrink-0" tabIndex={-1}>
                {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="newPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nueva contraseña
            </label>
            <div className="flex items-center gap-2">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPwError(""); setPwSuccess(false) }}
                className="flex h-10 w-full rounded-md border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-emerald-500 dark:focus-visible:border-emerald-400 disabled:opacity-50"
                minLength={8}
                required
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="text-slate-400 hover:text-slate-600 shrink-0" tabIndex={-1}>
                {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">Mínimo 8 caracteres</p>
          </div>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-emerald-600">Contraseña actualizada correctamente</p>}
          <button
            type="submit"
            disabled={pwLoading}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pwLoading ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>

      {/* Exportar datos */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Exportar datos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Descarga tu historial completo de inversiones en formato CSV.
          </p>
        </div>
        {exportError && <p className="text-sm text-red-600">{exportError}</p>}
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {exportLoading ? "Generando..." : "Descargar CSV"}
        </button>
      </div>

      {/* Eliminar cuenta */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-red-700 dark:text-red-400">Eliminar cuenta</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Esta acción es irreversible. Se eliminarán tu cuenta y todos tus datos:
            bancos, inversiones y valores históricos.
          </p>
        </div>
        <form onSubmit={handleDelete} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="confirm" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Escribe tu email para confirmar
            </label>
            <input
              id="confirm"
              type="email"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setDeleteError("") }}
              className="flex h-10 w-full rounded-md border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-red-500 disabled:opacity-50"
              placeholder={userEmail || "tu@email.com"}
              required
            />
          </div>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <button
            type="submit"
            disabled={deleteLoading}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteLoading ? "Eliminando..." : "Eliminar mi cuenta"}
          </button>
        </form>
      </div>
    </div>
  )
}
