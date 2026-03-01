"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, TrendingUp, PlusCircle, List, Building2, LogOut, Users, ScrollText, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/banks", label: "Bancos", icon: Building2 },
  { href: "/investments", label: "Inversiones", icon: List },
  { href: "/values/new", label: "Registrar valor", icon: PlusCircle },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
]

interface NavSidebarProps {
  userEmail?: string
  isAdmin?: boolean
  lastLoginAt?: Date | null
}

export function NavSidebar({ userEmail, isAdmin, lastLoginAt }: NavSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-emerald-400" />
          <span className="text-xl font-bold">NAV Monitor</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      {isAdmin && (
        <div className="px-4 pb-2 border-t border-slate-700 pt-4">
          <Link
            href="/admin/users"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname.startsWith('/admin')
                ? "bg-emerald-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Users className="h-4 w-4" />
            Usuarios
          </Link>
        </div>
      )}
      <div className="px-4 pb-2 space-y-1">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
            pathname === '/profile'
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          <UserCircle className="h-3 w-3" />
          Mi perfil
        </Link>
        <Link
          href="/legal"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
            pathname === '/legal'
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          <ScrollText className="h-3 w-3" />
          Aviso legal
        </Link>
      </div>
      <div className="p-4 border-t border-slate-700 space-y-2">
        {userEmail && (
          <p className="text-slate-400 text-xs truncate" title={userEmail}>{userEmail}</p>
        )}
        {lastLoginAt && (
          <p className="text-slate-500 text-xs">
            Última sesión: {new Date(lastLoginAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors w-full"
        >
          <LogOut className="h-3 w-3" />
          Cerrar sesión
        </button>
        <div className="text-slate-500 text-xs space-y-0.5">
          <p>v0.14.0</p>
          <p>© tacombel@gmail.com</p>
        </div>
      </div>
    </aside>
  )
}
