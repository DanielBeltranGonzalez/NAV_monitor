"use client"

import { useEffect, useState } from "react"

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (data.email) setUserEmail(data.email) })
  }, [])

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (confirm !== userEmail) {
      setError("El email no coincide")
      return
    }
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/me", { method: "DELETE" })
      if (res.ok) {
        window.location.href = "/auth/login"
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Error al eliminar la cuenta")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Mi perfil</h1>

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
              onChange={(e) => { setConfirm(e.target.value); setError("") }}
              className="flex h-10 w-full rounded-md border-2 border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-red-500 disabled:opacity-50"
              placeholder={userEmail || "tu@email.com"}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Eliminando..." : "Eliminar mi cuenta"}
          </button>
        </form>
      </div>
    </div>
  )
}
