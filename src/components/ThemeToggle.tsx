"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs transition-colors"
    >
      {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  )
}
