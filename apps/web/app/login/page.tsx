"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"login"|"signup">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/") // כבר מחובר
    })
  }, [router])

  const submit = async () => {
    setError(null)
    setLoading(true)
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      router.replace("/")
    } catch (e: any) {
      setError(e?.message || "שגיאה לא ידועה")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-semibold mb-4">{mode === "login" ? "התחברות" : "יצירת משתמש"}</h1>

      <div className="space-y-3">
        <div>
          <Label htmlFor="email">אימייל</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">סיסמה</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="בחר סיסמה חזקה" />
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex gap-2 pt-2">
          <Button onClick={submit} disabled={loading}>
            {mode === "login" ? "התחבר" : "הרשמה"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "עבור להרשמה" : "עבור להתחברות"}
          </Button>
        </div>
      </div>
    </main>
  )
}
