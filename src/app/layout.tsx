import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { NavSidebar } from "@/components/NavSidebar"
import { TopBar } from "@/components/TopBar"
import { LegalModal } from "@/components/LegalModal"
import { ThemeProvider } from "@/components/ThemeProvider"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
  let isAdmin = false
  let lastLoginAt: Date | null = null
  if (token) {
    const payload = await verifyToken(token)
    userEmail = payload?.email
    isAdmin = payload?.role === 'ADMIN'
    if (payload?.sub) {
      const user = await prisma.user.findUnique({
        where: { id: Number(payload.sub) },
        select: { lastLoginAt: true },
      })
      lastLoginAt = user?.lastLoginAt ?? null
    }
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');})()` }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <div className="flex min-h-screen">
            <NavSidebar isAdmin={isAdmin} />
            <div className="flex-1 flex flex-col">
              <TopBar userEmail={userEmail} lastLoginAt={lastLoginAt?.toISOString() ?? null} />
              <main className="flex-1 p-8 bg-background text-justify">
                {children}
              </main>
            </div>
            {userEmail && <LegalModal />}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
