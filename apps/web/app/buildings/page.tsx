"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Client = {
  id: string
  name: string
}

type Building = {
  id: string
  client_id: string | null
  address: string
  entrance: string | null
  notes: string | null
}

export default function BuildingsPage() {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [rows, setRows] = useState<Building[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Building>>({
    client_id: null,
    address: "",
    entrance: "",
    notes: "",
  })

  const clientsById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.name])), [clients])

  const load = async () => {
    setLoading(true)
    const [cRes, bRes] = await Promise.all([
      supabase.from<Client>("clients").select("id,name").order("name", { ascending: true }),
      supabase.from<Building>("buildings").select("id,client_id,address,entrance,notes").order("address", { ascending: true }),
    ])
    if (cRes.error) console.error(cRes.error)
    if (bRes.error) console.error(bRes.error)
    setClients(cRes.data || [])
    setRows(bRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({ client_id: null, address: "", entrance: "", notes: "" })
  }

  const save = async () => {
    if (!form.address || form.address.trim() === "") {
      alert("יש להזין כתובת בניין")
      return
    }
    setLoading(true)
    if (editingId) {
      const { error } = await supabase.from("buildings").update({
        client_id: form.client_id || null,
        address: form.address,
        entrance: form.entrance,
        notes: form.notes,
      }).eq("id", editingId)
      if (error) alert("שגיאה בעדכון: " + error.message)
    } else {
      const { error } = await supabase.from("buildings").insert([{
        client_id: form.client_id || null,
        address: form.address!,
        entrance: form.entrance || null,
        notes: form.notes || null,
      }])
      if (error) alert("שגיאה בהוספה: " + error.message)
    }
    setOpen(false)
    resetForm()
    await load()
    setLoading(false)
  }

  const editRow = (r: Building) => {
    setEditingId(r.id)
    setForm({ ...r })
    setOpen(true)
  }

  const deleteRow = async (id: string) => {
    if (!confirm("למחוק את הבניין? הפעולה בלתי הפיכה")) return
    setLoading(true)
    const { error } = await supabase.from("buildings").delete().eq("id", id)
    if (error) alert("שגיאה במחיקה: " + error.message)
    await load()
    setLoading(false)
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">בניינים</h2>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>בניין חדש</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? "עריכת בניין" : "בניין חדש"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label htmlFor="client">לקוח (ועד/מנהל) – לא חובה</Label>
                <Select
                  value={form.client_id ?? "none"}
                  onValueChange={(val) => setForm({ ...form, client_id: val === "none" ? null : val })}
                >
                  <SelectTrigger id="client"><SelectValue placeholder="בחר לקוח (אופציונלי)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— ללא —</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="address">כתובת *</Label>
                <Input id="address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="entrance">כניסה</Label>
                <Input id="entrance" value={form.entrance || ""} onChange={(e) => setForm({ ...form, entrance: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="notes">הערות</Label>
                <Textarea id="notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>ביטול</Button>
                <Button onClick={save} disabled={loading}>{editingId ? "שמור" : "צור בניין"}</Button>
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
              <th className="p-2 border-b">לקוח</th>
              <th className="p-2 border-b">כתובת</th>
              <th className="p-2 border-b">כניסה</th>
              <th className="p-2 border-b">הערות</th>
              <th className="p-2 border-b w-64">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="p-3 text-zinc-500">אין עדיין בניינים.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-zinc-50">
                <td className="p-2 border-b">{r.client_id ? (clientsById[r.client_id] || "—") : "—"}</td>
                <td className="p-2 border-b">{r.address}</td>
                <td className="p-2 border-b">{r.entrance || "—"}</td>
                <td className="p-2 border-b">{r.notes || "—"}</td>
                <td className="p-2 border-b">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/site-hub?building=${r.id}`}>צפה ב־Site Hub</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => editRow(r)}>עריכה</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteRow(r.id)}>מחיקה</Button>
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
