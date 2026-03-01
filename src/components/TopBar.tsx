"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

interface TopBarProps {
  userEmail?: string
  lastLoginAt?: string | null
}

export function TopBar({ userEmail, lastLoginAt }: TopBarProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  if (!userEmail) return null

  return (
    <header className="flex items-center justify-end gap-4 px-8 py-3 border-b bg-background dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
      <ThemeToggle />
      <span className="text-slate-600 dark:text-slate-300 font-medium">{userEmail}</span>
      {lastLoginAt && (
        <span>
          Última sesión:{" "}
          {new Date(lastLoginAt).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <LogOut className="h-3.5 w-3.5" />
        Cerrar sesión
      </button>
    </header>
  )
}
