"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Client = { id: string; name: string | null }
type Building = { id: string; client_id: string | null; address: string; entrance: string | null; notes: string | null }
type Elevator = { id: string; building_id: string; manufacturer: string | null; model: string | null; serial_number: string | null }
type Ticket = { id: string; building_id: string; elevator_id: string | null; title: string; severity: string; status: string; created_at: string }

export default function SiteHubPage() {
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [elevators, setElevators] = useState<Elevator[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [buildingId, setBuildingId] = useState<string>("none")

  const params = useSearchParams()

  // אם הגיענו עם ?building=... נטען את הבניין הנבחר מיד
  useEffect(() => {
    const initial = params.get("building")
    if (initial) setBuildingId(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const clientsById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.name || ""])), [clients])
  const building = useMemo(() => buildings.find(b => b.id === buildingId) || null, [buildings, buildingId])
  const buildingElevators = useMemo(() => elevators.filter(e => e.building_id === buildingId), [elevators, buildingId])
  const buildingTickets = useMemo(() => tickets.filter(t => t.building_id === buildingId), [tickets, buildingId])

  const loadAll = async () => {
    setLoading(true)
    const [bRes, cRes, eRes, tRes] = await Promise.all([
      supabase.from<Building>("buildings").select("id,client_id,address,entrance,notes").order("address", { ascending: true }),
      supabase.from<Client>("clients").select("id,name").order("name", { ascending: true }),
      supabase.from<Elevator>("elevators").select("id,building_id,manufacturer,model,serial_number").order("created_at", { ascending: false }),
      supabase.from<Ticket>("tickets").select("id,building_id,elevator_id,title,severity,status,created_at").order("created_at", { ascending: false })
    ])
    if (bRes.error) console.error(bRes.error)
    if (cRes.error) console.error(cRes.error)
    if (eRes.error) console.error(eRes.error)
    if (tRes.error) console.error(tRes.error)
    setBuildings(bRes.data || [])
    setClients(cRes.data || [])
    setElevators(eRes.data || [])
    setTickets(tRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const sevBadge = (s: string) => {
    const map: Record<string, string> = {
      low: "bg-emerald-100 text-emerald-800",
      medium: "bg-amber-100 text-amber-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    }
    return <span className={`inline-block rounded px-2 py-0.5 text-xs ${map[s] || "bg-zinc-100 text-zinc-800"}`}>{s}</span>
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      assigned: "bg-indigo-100 text-indigo-800",
      in_progress: "bg-purple-100 text-purple-800",
      waiting_parts: "bg-yellow-100 text-yellow-800",
      done: "bg-emerald-100 text-emerald-800",
      cancelled: "bg-zinc-200 text-zinc-700",
    }
    return <span className={`inline-block rounded px-2 py-0.5 text-xs ${map[s] || "bg-zinc-100 text-zinc-800"}`}>{s}</span>
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">Site Hub</h2>
        <span className="text-zinc-500">{loading ? "טוען…" : ""}</span>
      </div>

      {/* בחירת בניין */}
      <Card>
        <CardHeader>
          <CardTitle>בחירת בניין</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Select value={buildingId} onValueChange={(val) => setBuildingId(val)}>
            <SelectTrigger className="w-full sm:w-96"><SelectValue placeholder="בחר בניין" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>— בחר —</SelectItem>
              {buildings.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.address}{b.entrance ? `, כניסה ${b.entrance}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* מידע על הבניין והלקוח */}
      {building && (
        <Card>
          <CardHeader>
            <CardTitle>מידע כללי</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-6">
              <div><span className="text-zinc-500">כתובת: </span>{building.address}{building.entrance ? `, כניסה ${building.entrance}` : ""}</div>
              <div><span className="text-zinc-500">לקוח: </span>{building.client_id ? (clientsById[building.client_id] || "—") : "—"}</div>
            </div>
            {building.notes ? (
              <>
                <Separator className="my-2" />
                <div>
                  <span className="text-zinc-500">הערות:</span>
                  <div>{building.notes}</div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* מעליות בבניין */}
      {building && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>מעליות בבניין</CardTitle>
          </CardHeader>
          <CardContent>
            {buildingElevators.length === 0 ? (
              <div className="text-zinc-500">אין עדיין מעליות משויכות.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border border-zinc-200 rounded-lg overflow-hidden">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="p-2 border-b">יצרן</th>
                      <th className="p-2 border-b">דגם</th>
                      <th className="p-2 border-b">מס׳ סידורי</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingElevators.map(e => (
                      <tr key={e.id} className="hover:bg-zinc-50">
                        <td className="p-2 border-b">{e.manufacturer || "—"}</td>
                        <td className="p-2 border-b">{e.model || "—"}</td>
                        <td className="p-2 border-b">{e.serial_number || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* קריאות בבניין */}
      {building && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>קריאות פעילות</CardTitle>
          </CardHeader>
          <CardContent>
            {buildingTickets.length === 0 ? (
              <div className="text-zinc-500">אין קריאות לבניין זה.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border border-zinc-200 rounded-lg overflow-hidden">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="p-2 border-b">כותרת</th>
                      <th className="p-2 border-b">מעלית</th>
                      <th className="p-2 border-b">חומרה</th>
                      <th className="p-2 border-b">סטטוס</th>
                      <th className="p-2 border-b">נפתח</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingTickets.map(t => {
                      const e = elevators.find(e => e.id === t.elevator_id)
                      const elevatorLabel = e ? (e.model || `מס׳ ${e.serial_number || "—"}`) : "—"
                      return (
                        <tr key={t.id} className="hover:bg-zinc-50">
                          <td className="p-2 border-b">{t.title}</td>
                          <td className="p-2 border-b">{elevatorLabel}</td>
                          <td className="p-2 border-b">
                            {(() => {
                              const map: Record<string, string> = {
                                low: "bg-emerald-100 text-emerald-800",
                                medium: "bg-amber-100 text-amber-800",
                                high: "bg-orange-100 text-orange-800",
                                critical: "bg-red-100 text-red-800",
                              }
                              return <span className={`inline-block rounded px-2 py-0.5 text-xs ${map[t.severity] || "bg-zinc-100 text-zinc-800"}`}>{t.severity}</span>
                            })()}
                          </td>
                          <td className="p-2 border-b">
                            {(() => {
                              const map: Record<string, string> = {
                                new: "bg-blue-100 text-blue-800",
                                assigned: "bg-indigo-100 text-indigo-800",
                                in_progress: "bg-purple-100 text-purple-800",
                                waiting_parts: "bg-yellow-100 text-yellow-800",
                                done: "bg-emerald-100 text-emerald-800",
                                cancelled: "bg-zinc-200 text-zinc-700",
                              }
                              return <span className={`inline-block rounded px-2 py-0.5 text-xs ${map[t.status] || "bg-zinc-100 text-zinc-800"}`}>{t.status}</span>
                            })()}
                          </td>
                          <td className="p-2 border-b">{new Date(t.created_at).toLocaleString("he-IL")}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
