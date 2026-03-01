"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const SESSION_KEY = "legal_shown"

export function LegalModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setOpen(true)
    }
  }, [])

  function handleAccept() {
    sessionStorage.setItem(SESSION_KEY, "1")
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Aviso legal</h2>
        <p className="text-sm text-slate-600">
          NAV Monitor es una herramienta de seguimiento personal de inversiones.
          <strong> No constituye asesoramiento financiero</strong> y los datos mostrados
          dependen exclusivamente de la información introducida por el usuario.
        </p>
        <p className="text-sm text-slate-600">
          Al continuar, aceptas el uso de la aplicación bajo tu propia responsabilidad.
          Puedes consultar el aviso legal completo en cualquier momento.
        </p>
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/legal"
            onClick={handleAccept}
            className="text-sm text-emerald-600 hover:underline"
          >
            Leer aviso completo
          </Link>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
