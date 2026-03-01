"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors w-full"
    >
      {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  )
}
