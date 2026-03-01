"use client"

import { useEffect, useState } from "react"
import { formatDate } from "@/lib/formatters"

interface UserRow {
  id: number
  email: string
  role: string
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>({})

  async function loadUsers() {
    const res = await fetch("/api/admin/users")
    if (res.ok) {
      const data = await res.json()
      setUsers(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Determine current user id from the first ADMIN in list (rough heuristic)
    // Actually, fetch current session info from a small self-identify call
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data: UserRow[]) => {
        setUsers(data)
        // We'll identify current user via the token — read from cookie not possible client-side
        // We rely on the backend 400 "No puedes eliminarte a ti mismo" for safety
      })
      .finally(() => setLoading(false))

    // Get current user id via profile endpoint (using dashboard as proxy)
    fetch("/api/values/dashboard")
      .then((r) => r.json())
      .then(() => {
        // Can't easily get current id from this, rely on server-side check instead
      })
      .catch(() => {})
  }, [])

  async function handleDelete(id: number, email: string) {
    if (!confirm(`¿Eliminar al usuario ${email}?`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (res.ok || res.status === 204) {
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } else {
      const body = await res.json().catch(() => ({}))
      alert(body.error ?? "Error al eliminar")
    }
  }

  async function handleResetPassword(id: number) {
    const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" })
    if (res.ok) {
      const { password } = await res.json()
      setResetPasswords((prev) => ({ ...prev, [id]: password }))
    } else {
      alert("Error al resetear contraseña")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Cargando...
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Gestión de usuarios</h1>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Rol</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha de registro</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Contraseña temporal</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-800">{u.email}</td>
                <td className="px-4 py-3">
                  {u.role === "ADMIN" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      Usuario
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(new Date(u.createdAt))}
                </td>
                <td className="px-4 py-3">
                  {resetPasswords[u.id] && (
                    <code className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded text-xs font-mono">
                      {resetPasswords[u.id]}
                    </code>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleResetPassword(u.id)}
                    className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Resetear
                  </button>
                  <button
                    onClick={() => handleDelete(u.id, u.email)}
                    disabled={u.role === "ADMIN"}
                    className="text-xs px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={u.role === "ADMIN" ? "No se puede eliminar al administrador" : "Eliminar usuario"}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-slate-400">No hay usuarios registrados.</div>
        )}
      </div>
    </div>
  )
}
