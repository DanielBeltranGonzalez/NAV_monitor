"use client"

import { useState } from "react"
import Link from "next/link"
import { TrendingUp, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        window.location.href = "/dashboard"
      } else {
        const data = await res.json()
        setError(data.error ?? "Error al registrarse")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center">
          <TrendingUp className="h-8 w-8 text-emerald-500" />
        </div>
        <CardTitle className="text-2xl">NAV Monitor</CardTitle>
        <p className="text-sm text-slate-500">Crea tu cuenta</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <div className="flex items-center gap-2">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-400 hover:text-slate-600 shrink-0"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">Mínimo 8 caracteres</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="text-emerald-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
