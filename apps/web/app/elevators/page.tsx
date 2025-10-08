"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Building = { id: string; address: string; entrance: string | null }
type Elevator = {
  id: string
  building_id: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  controller: string | null
  install_year: number | null
}

export default function ElevatorsPage() {
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rows, setRows] = useState<Elevator[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Elevator>>({
    building_id: "" as any,
    manufacturer: "",
    model: "",
    serial_number: "",
    controller: "",
    install_year: undefined as any
  })

  const bById = useMemo(() => Object.fromEntries(buildings.map(b => [b.id, `${b.address}${b.entrance ? `, כניסה ${b.entrance}` : ""}`])), [buildings])

  const load = async () => {
    setLoading(true)
    const [bRes, eRes] = await Promise.all([
      supabase.from<Building>("buildings").select("id,address,entrance").order("address", { ascending: true }),
      supabase.from<Elevator>("elevators").select("id,building_id,manufacturer,model,serial_number,controller,install_year").order("created_at", { ascending: false }),
    ])
    if (bRes.error) console.error(bRes.error)
    if (eRes.error) console.error(eRes.error)
    setBuildings(bRes.data || [])
    setRows(eRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      building_id: "" as any,
      manufacturer: "",
      model: "",
      serial_number: "",
      controller: "",
      install_year: undefined as any
    })
  }

  const save = async () => {
    if (!form.building_id || form.building_id === "none") {
      alert("יש לבחור בניין")
      return
    }
    setLoading(true)
    const payload = {
      building_id: form.building_id!,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      controller: form.controller || null,
      install_year: form.install_year ? Number(form.install_year) : null
    }
    if (editingId) {
      const { error } = await supabase.from("elevators").update(payload).eq("id", editingId)
      if (error) alert("שגיאה בעדכון: " + error.message)
    } else {
      const { error } = await supabase.from("elevators").insert([payload])
      if (error) alert("שגיאה בהוספה: " + error.message)
    }
    setOpen(false)
    resetForm()
    await load()
    setLoading(false)
  }

  const editRow = (r: Elevator) => {
    setEditingId(r.id)
    setForm({ ...r })
    setOpen(true)
  }

  const deleteRow = async (id: string) => {
    if (!confirm("למחוק את המעלית? הפעולה בלתי הפיכה")) return
    setLoading(true)
    const { error } = await supabase.from("elevators").delete().eq("id", id)
    if (error) alert("שגיאה במחיקה: " + error.message)
    await load()
    setLoading(false)
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">מעליות</h2>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>מעלית חדשה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? "עריכת מעלית" : "מעלית חדשה"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label>בניין *</Label>
                <Select
                  value={(form.building_id as string) || "none"}
                  onValueChange={(val) => setForm({ ...form, building_id: val === "none" ? ("" as any) : val })}
                >
                  <SelectTrigger><SelectValue placeholder="בחר בניין" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>— בחר —</SelectItem>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{bById[b.id]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>יצרן</Label>
                  <Input value={form.manufacturer || ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                </div>
                <div>
                  <Label>דגם</Label>
                  <Input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                </div>
                <div>
                  <Label>מס׳ סידורי</Label>
                  <Input value={form.serial_number || ""} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
                </div>
                <div>
                  <Label>בקר</Label>
                  <Input value={form.controller || ""} onChange={(e) => setForm({ ...form, controller: e.target.value })} />
                </div>
                <div>
                  <Label>שנת התקנה</Label>
                  <Input type="number" value={form.install_year ?? ""} onChange={(e) => setForm({ ...form, install_year: e.target.value ? Number(e.target.value) : undefined as any })} />
                </div>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>ביטול</Button>
                <Button onClick={save} disabled={loading}>{editingId ? "שמור" : "צור מעלית"}</Button>
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
              <th className="p-2 border-b">בניין</th>
              <th className="p-2 border-b">יצרן</th>
              <th className="p-2 border-b">דגם</th>
              <th className="p-2 border-b">מס׳ סידורי</th>
              <th className="p-2 border-b">בקר</th>
              <th className="p-2 border-b">שנת התקנה</th>
              <th className="p-2 border-b w-40">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="p-3 text-zinc-500">אין עדיין מעליות.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-zinc-50">
                <td className="p-2 border-b">{bById[r.building_id] || "—"}</td>
                <td className="p-2 border-b">{r.manufacturer || "—"}</td>
                <td className="p-2 border-b">{r.model || "—"}</td>
                <td className="p-2 border-b">{r.serial_number || "—"}</td>
                <td className="p-2 border-b">{r.controller || "—"}</td>
                <td className="p-2 border-b">{r.install_year ?? "—"}</td>
                <td className="p-2 border-b">
                  <div className="flex gap-2">
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
