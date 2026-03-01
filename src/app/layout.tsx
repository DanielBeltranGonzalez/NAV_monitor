import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { NavSidebar } from "@/components/NavSidebar"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NAV Monitor",
  description: "Track your investment Net Asset Values",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value ?? null

  let userEmail: string | undefined
  if (token) {
    const payload = await verifyToken(token)
    userEmail = payload?.email
  }

  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
        <div className="flex min-h-screen">
          <NavSidebar userEmail={userEmail} />
          <main className="flex-1 p-8 bg-slate-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
