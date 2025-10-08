"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"

type SessionUser = {
  email: string | null
}

export default function TopBar() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      const email = data.session?.user?.email ?? null
      setUser(email ? { email } : null)
      setLoading(false)
    }
    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null
      setUser(email ? { email } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto max-w-screen-2xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          Malitan • מעליתן
        </Link>

        <nav className="flex items-center gap-2">
          <Link className="text-sm hover:underline" href="/clients">לקוחות</Link>
          <Link className="text-sm hover:underline" href="/buildings">בניינים</Link>
          <Link className="text-sm hover:underline" href="/elevators">מעליות</Link>
          <Link className="text-sm hover:underline" href="/tickets">קריאות</Link>
          <Link className="text-sm hover:underline" href="/site-hub">Site Hub</Link>
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-sm text-zinc-500">טוען…</span>
          ) : user ? (
            <>
              <span className="text-sm text-zinc-600">מחובר כ־{user.email}</span>
              <Button size="sm" variant="outline" onClick={() => supabase.auth.signOut()}>
                יציאה
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link href="/login">התחברות</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
