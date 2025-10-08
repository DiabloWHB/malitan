"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Building = { id: string; address: string; entrance: string | null }
type Elevator = { id: string; building_id: string; model: string | null; serial_number: string | null }
type Ticket = {
  id: string
  building_id: string
  elevator_id: string | null
  title: string
  description: string | null
  severity: string
  status: string
  created_at?: string
}

/** עדכון: מחזיקים תאימות אחורה (file_url/original_name) וגם את הסכמה החדשה (file_path/file_name) */
type Attachment = {
  id: string
  ticket_id: string
  /** חדש: */
  file_path: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  created_at: string | null
  created_by: string | null
  /** ישן: */
  file_url?: string | null
  original_name?: string | null
}

export default function TicketsPage() {
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [elevators, setElevators] = useState<Elevator[]>([])
  const [rows, setRows] = useState<Ticket[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Ticket>>({
    building_id: "" as any,
    elevator_id: null,
    title: "",
    description: "",
    severity: "medium",
    status: "new"
  })

  // דיאלוג קבצים
  const [filesOpen, setFilesOpen] = useState(false)
  const [filesForTicket, setFilesForTicket] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const bById = useMemo(() => Object.fromEntries(buildings.map(b => [b.id, `${b.address}${b.entrance ? `, כניסה ${b.entrance}` : ""}`])), [buildings])
  const eById = useMemo(() => Object.fromEntries(elevators.map(e => [e.id, e.model ? `${e.model} (${e.serial_number || "—"})` : `מס׳ ${e.serial_number}`])), [elevators])

  const load = async () => {
    setLoading(true)
    const [bRes, eRes, tRes] = await Promise.all([
      supabase.from<Building>("buildings").select("id,address,entrance"),
      supabase.from<Elevator>("elevators").select("id,building_id,model,serial_number"),
      supabase.from<Ticket>("tickets").select("*").order("created_at", { ascending: false }),
    ])
    if (bRes.error) console.error(bRes.error)
    if (eRes.error) console.error(eRes.error)
    if (tRes.error) console.error(tRes.error)
    setBuildings(bRes.data || [])
    setElevators(eRes.data || [])
    setRows(tRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({ building_id: "" as any, elevator_id: null, title: "", description: "", severity: "medium", status: "new" })
  }

  const save = async () => {
    if (!form.building_id || form.building_id === "none") {
      alert("יש לבחור בניין")
      return
    }
    if (!form.title) {
      alert("חובה לתת כותרת לקריאה")
      return
    }
    setLoading(true)
    const payload = {
      building_id: form.building_id!,
      elevator_id: form.elevator_id || null,
      title: form.title!,
      description: form.description || null,
      severity: form.severity || "medium",
      status: form.status || "new"
    }
    if (editingId) {
      const { error } = await supabase.from("tickets").update(payload).eq("id", editingId)
      if (error) alert("שגיאה בעדכון: " + error.message)
    } else {
      const { error } = await supabase.from("tickets").insert([payload])
      if (error) alert("שגיאה בהוספה: " + error.message)
    }
    setOpen(false)
    resetForm()
    await load()
    setLoading(false)
  }

  const editRow = (r: Ticket) => {
    setEditingId(r.id)
    setForm({ ...r })
    setOpen(true)
  }

  const deleteRow = async (id: string) => {
    if (!confirm("למחוק את הקריאה?")) return
    setLoading(true)
    const { error } = await supabase.from("tickets").delete().eq("id", id)
    if (error) alert("שגיאה במחיקה: " + error.message)
    await load()
    setLoading(false)
  }

  // --- קבצים לקריאה ---

  const getCompanyId = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")
    const { data, error } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()
    if (error || !data?.company_id) throw new Error("No company_id for user")
    return data.company_id as string
  }

  const openFilesDialog = async (ticketId: string) => {
    setFilesForTicket(ticketId)
    setFilesOpen(true)
    await loadAttachments(ticketId)
  }

  const loadAttachments = async (ticketId: string) => {
    // שואבים גם את השדות הישנים וגם את החדשים
    const { data, error } = await supabase
      .from<Attachment>("attachments")
      .select("id,ticket_id,file_path,file_name,file_type,file_size,created_at,created_by,file_url,original_name")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
    if (error) {
      console.error(error)
      setAttachments([])
      setSignedUrls({})
      return
    }
    setAttachments(data || [])

    // צור Signed URLs עבור רשומות עם file_path (Bucket פרטי)
    const map: Record<string, string> = {}
    for (const r of data || []) {
      if (r.file_path) {
        const { data: urlData } = await supabase
          .storage
          .from("attachments")
          .createSignedUrl(r.file_path, 60 * 60) // שעה
        if (urlData?.signedUrl) {
          map[r.id] = urlData.signedUrl
        }
      }
    }
    setSignedUrls(map)
  }

  const detectFileType = (fileName: string): "image" | "pdf" | "other" => {
    const lower = fileName.toLowerCase()
    if (/\.(png|jpg|jpeg|gif|webp|heic|heif)$/.test(lower)) return "image"
    if (lower.endsWith(".pdf")) return "pdf"
    return "other"
  }

  // ניקוי שם הקובץ – החלפת רווחים/עברית/סימנים ל-ASCII בטוח
  const sanitize = (name: string) => {
    const parts = name.split(".")
    const ext = parts.length > 1 ? "." + parts.pop() : ""
    const base = parts.join(".")
    const safeBase = base.normalize("NFKD").replace(/[^\w.-]+/g, "_")
    return (safeBase || "file") + ext.toLowerCase()
  }

  const uploadFile = async () => {
    if (!selectedFile || !filesForTicket) return
    setUploading(true)
    try {
      const companyId = await getCompanyId()
      const safeName = sanitize(selectedFile.name)
      const storagePath = `company/${companyId}/tickets/${filesForTicket}/${Date.now()}__${safeName}`

      // העלאה ל-Storage (bucket: attachments) - פרטי
      const { error: upErr } = await supabase.storage.from("attachments").upload(storagePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      })
      if (upErr) throw upErr

      // הוספת רשומה ב-DB (שדות חדשים; נשמור גם original_name לתאימות)
      const { data: u } = await supabase.auth.getUser()
      const fileType = detectFileType(selectedFile.name)
      const { error: insErr } = await supabase.from("attachments").insert([{
        ticket_id: filesForTicket,
        company_id: companyId,
        file_name: selectedFile.name,
        file_path: storagePath,
        file_size: selectedFile.size,
        file_type: fileType,
        created_by: u?.user?.id ?? null,
        original_name: selectedFile.name  // לשמירת תאימות להצגות ישנות
      }])
      if (insErr) throw insErr

      setSelectedFile(null)
      await loadAttachments(filesForTicket)
      alert("העלאה הושלמה")
    } catch (e: any) {
      alert("שגיאה בהעלאה: " + (e?.message || e))
    } finally {
      setUploading(false)
    }
  }

  const deleteAttachment = async (att: Attachment) => {
    if (!confirm("למחוק את הקובץ מהרשימה?")) return

    // מחיקת הרשומה (מחיקת אובייקט מה-Storage מותרת רק ל-admin במדיניות; כאן נשאיר מחיקה לוגית מה-DB)
    const { error } = await supabase.from("attachments").delete().eq("id", att.id)
    if (error) {
      alert("שגיאה במחיקת הרשומה: " + error.message)
      return
    }
    if (filesForTicket) await loadAttachments(filesForTicket)
  }

  const urlForAttachment = (a: Attachment): string | undefined => {
    // אם יש Signed URL (file_path) – עדיף
    if (a.file_path && signedUrls[a.id]) return signedUrls[a.id]
    // תאימות לרשומות ישנות עם file_url ציבורי
    if (a.file_url) return a.file_url
    return undefined
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">קריאות שירות</h2>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>קריאה חדשה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? "עריכת קריאה" : "קריאה חדשה"}</DialogTitle>
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
                      <SelectItem key={b.id} value={b.id}>
                        {bById[b.id]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>מעלית (אופציונלי)</Label>
                <Select
                  value={form.elevator_id || "none"}
                  onValueChange={(val) => setForm({ ...form, elevator_id: val === "none" ? null : val })}
                >
                  <SelectTrigger><SelectValue placeholder="בחר מעלית" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— ללא —</SelectItem>
                    {elevators
                      .filter(e => e.building_id === form.building_id)
                      .map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {eById[e.id]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>כותרת *</Label>
                <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div>
                <Label>תיאור</Label>
                <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>חומרה</Label>
                  <Select value={form.severity || "medium"} onValueChange={(val) => setForm({ ...form, severity: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוכה</SelectItem>
                      <SelectItem value="medium">בינונית</SelectItem>
                      <SelectItem value="high">גבוהה</SelectItem>
                      <SelectItem value="critical">קריטית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>סטטוס</Label>
                  <Select value={form.status || "new"} onValueChange={(val) => setForm({ ...form, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">חדש</SelectItem>
                      <SelectItem value="assigned">שויך</SelectItem>
                      <SelectItem value="in_progress">בטיפול</SelectItem>
                      <SelectItem value="waiting_parts">מחכה לחלקים</SelectItem>
                      <SelectItem value="done">הסתיים</SelectItem>
                      <SelectItem value="cancelled">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>ביטול</Button>
                <Button onClick={save} disabled={loading}>{editingId ? "שמור" : "צור קריאה"}</Button>
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
              <th className="p-2 border-b">מעלית</th>
              <th className="p-2 border-b">כותרת</th>
              <th className="p-2 border-b">חומרה</th>
              <th className="p-2 border-b">סטטוס</th>
              <th className="p-2 border-b w-56">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="p-3 text-zinc-500">אין קריאות עדיין.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-zinc-50">
                <td className="p-2 border-b">{bById[r.building_id] || "—"}</td>
                <td className="p-2 border-b">{r.elevator_id ? eById[r.elevator_id] : "—"}</td>
                <td className="p-2 border-b">{r.title}</td>
                <td className="p-2 border-b">{r.severity}</td>
                <td className="p-2 border-b">{r.status}</td>
                <td className="p-2 border-b">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openFilesDialog(r.id)}>קבצים</Button>
                    <Button variant="outline" size="sm" onClick={() => editRow(r)}>עריכה</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteRow(r.id)}>מחיקה</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={filesOpen} onOpenChange={(o) => { setFilesOpen(o); if (!o) { setFilesForTicket(null); setAttachments([]); setSelectedFile(null); setSignedUrls({}) } }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>קבצים לקריאה</DialogTitle>
          </DialogHeader>

          {!filesForTicket ? (
            <p className="text-zinc-500">לא נבחרה קריאה.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} accept="image/*,.pdf,video/mp4" />
                <Button onClick={uploadFile} disabled={uploading || !selectedFile}>העלה</Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border border-zinc-200 rounded-lg overflow-hidden">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="p-2 border-b">שם קובץ</th>
                      <th className="p-2 border-b">סוג</th>
                      <th className="p-2 border-b">קישור</th>
                      <th className="p-2 border-b w-28">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.length === 0 ? (
                      <tr><td colSpan={4} className="p-3 text-zinc-500">אין קבצים לקריאה זו.</td></tr>
                    ) : attachments.map(a => {
                      const name = a.file_name || a.original_name || "(ללא שם)"
                      const href = urlForAttachment(a)
                      return (
                        <tr key={a.id} className="hover:bg-zinc-50">
                          <td className="p-2 border-b">{name}</td>
                          <td className="p-2 border-b">{a.file_type || "—"}</td>
                          <td className="p-2 border-b">
                            {href ? (
                              <a className="text-blue-600 underline" href={href} target="_blank" rel="noreferrer">פתח</a>
                            ) : (
                              <span className="text-zinc-500">—</span>
                            )}
                          </td>
                          <td className="p-2 border-b">
                            <Button variant="destructive" size="sm" onClick={() => deleteAttachment(a)}>מחיקה</Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
