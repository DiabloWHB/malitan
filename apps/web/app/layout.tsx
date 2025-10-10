"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import TopBar from "@/components/ui/top-bar"
import { Toaster } from "@/components/ui/toaster"
import { Loader2 } from "lucide-react"
import { Inter, Rubik } from 'next/font/google'
import "./globals.css"

// טעינת גופנים
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-rubik',
  display: 'swap'
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // בדיקה ראשונית
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)

      // אם לא מחובר ולא בדף login - הפנה
      if (!session && pathname !== "/login") {
        router.push("/login")
      }

      // אם מחובר ובדף login - הפנה לדף הבית
      if (session && pathname === "/login") {
        router.push("/")
      }
    })

    // האזן לשינויים
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)

      if (!session && pathname !== "/login") {
        router.push("/login")
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname, router])

  // מסך טעינה
  if (loading) {
    return (
      <html lang="he" dir="rtl" className={`${inter.variable} ${rubik.variable}`}>
        <body className="bg-zinc-50 text-zinc-900 font-hebrew antialiased">
          <div className="flex flex-col items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-zinc-900" />
            <p className="mt-4 text-zinc-600">טוען מעליתן...</p>
          </div>
        </body>
      </html>
    )
  }

  // אם לא מחובר ולא בדף login - אל תציג כלום (בדרך להפניה)
  if (!session && pathname !== "/login") {
    return (
      <html lang="he" dir="rtl" className={`${inter.variable} ${rubik.variable}`}>
        <body className="bg-zinc-50 font-hebrew antialiased" />
      </html>
    )
  }

  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${rubik.variable}`}>
      <body className="bg-zinc-50 text-zinc-900 font-hebrew antialiased">
        {/* TopBar רק למשתמשים מחוברים */}
        {session && <TopBar />}
        
        <div className="mx-auto max-w-screen-2xl px-4 py-6">
          {children}
        </div>
        
        <Toaster />
      </body>
    </html>
  )
}