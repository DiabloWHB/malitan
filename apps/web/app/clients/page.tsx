"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Client = {
  id: string
  name: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  preferred_channel: "whatsapp" | "sms" | "email" | null
}

export default function ClientsPage() {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<Client>>({ name: "", contact_name: "", contact_phone: "", contact_email: "", preferred_channel: "whatsapp" })
  const [editingId, setEditingId] = useState<string | null>(null)

  // טען רשימת לקוחות בתחילת העמוד
  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from<Client>("clients")
      .select("id,name,contact_name,contact_phone,contact_email,preferred_channel")
      .order("name", { ascending: true })
    if (error) console.error(error)
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // שמירת טופס (הוספה או עדכון)
  const save = async () => {
    if (!form.name || form.name.trim() === "") {
      alert("יש להזין שם לקוח")
      return
    }
    setLoading(true)
    if (editingId) {
      const { error } = await supabase
        .from("clients")
        .update({
          name: form.name,
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          contact_email: form.contact_email,
          preferred_channel: form.preferred_channel,
        })
        .eq("id", editingId)
      if (error) alert("שגיאה בעדכון: " + error.message)
    } else {
      const { error } = await supabase.from("clients").insert([
        {
          // שים לב: כרגע אין לנו company_id מאובטח – נוסיף בהמשך עם Auth/RLS
          name: form.name,
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          contact_email: form.contact_email,
          preferred_channel: form.preferred_channel,
        },
      ])
      if (error) alert("שגיאה בהוספה: " + error.message)
    }

    setOpen(false)
    setEditingId(null)
    setForm({ name: "", contact_name: "", contact_phone: "", contact_email: "", preferred_channel: "whatsapp" })
    await load()
    setLoading(false)
  }

  const editRow = (row: Client) => {
    setEditingId(row.id)
    setForm(row)
    setOpen(true)
  }

  const deleteRow = async (id: string) => {
    if (!confirm("למחוק את הלקוח? הפעולה בלתי הפיכה")) return
    setLoading(true)
    const { error } = await supabase.from("clients").delete().eq("id", id)
    if (error) alert("שגיאה במחיקה: " + error.message)
    await load()
    setLoading(false)
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">לקוחות</h2>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm({ name: "", contact_name: "", contact_phone: "", contact_email: "", preferred_channel: "whatsapp" }) } }}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>לקוח חדש</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? "עריכת לקוח" : "לקוח חדש"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label htmlFor="name">שם לקוח *</Label>
                <Input id="name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="contact_name">איש קשר</Label>
                <Input id="contact_name" value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="contact_phone">טלפון</Label>
                <Input id="contact_phone" value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="contact_email">אימייל</Label>
                <Input id="contact_email" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="preferred_channel">ערוץ מועדף</Label>
                <select
                  id="preferred_channel"
                  className="border rounded-md p-2 w-full"
                  value={form.preferred_channel || "whatsapp"}
                  onChange={(e) => setForm({ ...form, preferred_channel: e.target.value as any })}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setOpen(false); setEditingId(null) }}>ביטול</Button>
                <Button onClick={save} disabled={loading}>{editingId ? "שמור" : "צור לקוח"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-zinc-500 mb-2">טוען…</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-right border border-zinc-200 rounded-lg overflow-hidden">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-2 border-b">שם לקוח</th>
              <th className="p-2 border-b">איש קשר</th>
              <th className="p-2 border-b">טלפון</th>
              <th className="p-2 border-b">אימייל</th>
              <th className="p-2 border-b">ערוץ מועדף</th>
              <th className="p-2 border-b w-40">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-3 text-zinc-500">אין עדיין לקוחות.</td>
              </tr>
            ) : clients.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50">
                <td className="p-2 border-b">{c.name}</td>
                <td className="p-2 border-b">{c.contact_name ?? "-"}</td>
                <td className="p-2 border-b">{c.contact_phone ?? "-"}</td>
                <td className="p-2 border-b">{c.contact_email ?? "-"}</td>
                <td className="p-2 border-b">{c.preferred_channel ?? "-"}</td>
                <td className="p-2 border-b">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => editRow(c)}>עריכה</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteRow(c.id)}>מחיקה</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
