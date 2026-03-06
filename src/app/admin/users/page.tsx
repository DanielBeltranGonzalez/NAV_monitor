"use client"

import { useEffect, useState } from "react"
import { formatDate } from "@/lib/formatters"

interface UserRow {
  id: number
  email: string
  role: string
  createdAt: string
  lastLoginAt: string | null
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
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([usersData, meData]) => {
        setUsers(usersData)
        if (meData?.id) setCurrentUserId(meData.id)
      })
      .finally(() => setLoading(false))
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

  async function handleToggleRole(u: UserRow) {
    const newRole = u.role === "ADMIN" ? "USER" : "ADMIN"
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: updated.role } : x)))
    } else {
      const body = await res.json().catch(() => ({}))
      alert(body.error ?? "Error al cambiar rol")
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
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Gestión de usuarios</h1>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Email</th>
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Rol</th>
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Registro</th>
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Última conexión</th>
              <th className="text-left px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Contraseña temporal</th>
              <th className="text-right px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-1.5 text-slate-800 dark:text-slate-100">{u.email}</td>
                <td className="px-4 py-1.5">
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
                <td className="px-4 py-1.5 text-slate-600 dark:text-slate-300">
                  {formatDate(new Date(u.createdAt))}
                </td>
                <td className="px-4 py-1.5 text-slate-600 dark:text-slate-300">
                  {u.lastLoginAt ? formatDate(new Date(u.lastLoginAt)) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-1.5">
                  {resetPasswords[u.id] && (
                    <code className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded text-xs font-mono">
                      {resetPasswords[u.id]}
                    </code>
                  )}
                </td>
                <td className="px-4 py-1.5 text-right space-x-2">
                  <button
                    onClick={() => handleToggleRole(u)}
                    disabled={u.id === currentUserId}
                    className="text-xs px-3 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={u.id === currentUserId ? "No puedes cambiar tu propio rol" : u.role === "ADMIN" ? "Degradar a Usuario" : "Promover a Admin"}
                  >
                    {u.role === "ADMIN" ? "→ Usuario" : "→ Admin"}
                  </button>
                  <button
                    onClick={() => handleResetPassword(u.id)}
                    className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Resetear
                  </button>
                  <button
                    onClick={() => handleDelete(u.id, u.email)}
                    disabled={u.id === currentUserId}
                    className="text-xs px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={u.id === currentUserId ? "No puedes eliminarte a ti mismo" : "Eliminar usuario"}
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
