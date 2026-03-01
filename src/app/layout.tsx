import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { NavSidebar } from "@/components/NavSidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NAV Monitor",
  description: "Track your investment Net Asset Values",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <NavSidebar />
          <main className="flex-1 p-8 bg-slate-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
