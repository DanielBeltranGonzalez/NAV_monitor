"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

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
      <h1 className="text-2xl font-bold text-slate-800">Mi perfil</h1>

      {/* Cambio de contraseña */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-700">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="currentPassword" className="text-sm font-medium text-slate-700">
              Contraseña actual
            </label>
            <div className="flex items-center gap-2">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPwError(""); setPwSuccess(false) }}
                className="flex h-10 w-full rounded-md border-2 border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-emerald-500 disabled:opacity-50"
                required
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="text-slate-400 hover:text-slate-600 shrink-0" tabIndex={-1}>
                {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
              Nueva contraseña
            </label>
            <div className="flex items-center gap-2">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPwError(""); setPwSuccess(false) }}
                className="flex h-10 w-full rounded-md border-2 border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-emerald-500 disabled:opacity-50"
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

      {/* Eliminar cuenta */}
      <div className="bg-white rounded-lg border border-red-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-red-700">Eliminar cuenta</h2>
          <p className="text-sm text-slate-500 mt-1">
            Esta acción es irreversible. Se eliminarán tu cuenta y todos tus datos:
            bancos, inversiones y valores históricos.
          </p>
        </div>
        <form onSubmit={handleDelete} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
              Escribe tu email para confirmar
            </label>
            <input
              id="confirm"
              type="email"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setDeleteError("") }}
              className="flex h-10 w-full rounded-md border-2 border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-red-500 disabled:opacity-50"
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
