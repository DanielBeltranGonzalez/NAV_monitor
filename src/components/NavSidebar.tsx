"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, TrendingUp, PlusCircle, List, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/banks", label: "Bancos", icon: Building2 },
  { href: "/investments", label: "Inversiones", icon: List },
  { href: "/values/new", label: "Registrar valor", icon: PlusCircle },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
]

export function NavSidebar() {
  const pathname = usePathname()

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
      <div className="p-4 border-t border-slate-700 text-slate-500 text-xs space-y-0.5">
        <p>v0.9.3</p>
        <p>© tacombel@gmail.com</p>
      </div>
    </aside>
  )
}
