"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Wrench,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  MapPin,
  Calendar,
  Hash,
  Info,
  Gauge,
  Zap,
  Box,
  Wind,
  DoorOpen,
  MoveHorizontal,
  Maximize2,
  RotateCw
} from "lucide-react"

type Building = {
  id: string
  address: string
  city: string
  entrance: string | null
}

type Elevator = {
  id: string
  building_id: string
  mol_number: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  controller: string | null
  install_year: number | null
  last_pm_date: string | null
  last_inspection_date: string | null
  // New fields
  load_capacity_kg?: number | null
  load_capacity_persons?: number | null
  speed_mps?: number | null
  stops_count?: number | null
  drive_type?: string | null
  door_type?: string | null
}

type Ticket = {
  id: string
  title: string
  status: string
  severity: string
  created_at: string
}

type InspectorReport = {
  id: string
  report_date: string
  items_section_7: any[]
  items_section_9: any[]
  inspector_name: string | null
}

// יצרנים נפוצים
const MANUFACTURERS = [
  "Otis",
  "Schindler",
  "Kone",
  "ThyssenKrupp",
  "Mitsubishi",
  "Hitachi",
  "Hyundai",
  "Sigma",
  "אחר"
]

// קונפיג סטטוס קריאות
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "חדש", color: "bg-purple-500" },
  assigned: { label: "שויך", color: "bg-blue-500" },
  in_progress: { label: "בטיפול", color: "bg-yellow-500" },
  waiting_parts: { label: "מחכה לחלקים", color: "bg-orange-500" },
  done: { label: "הושלם", color: "bg-green-500" },
  cancelled: { label: "בוטל", color: "bg-gray-500" }
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "נמוכה", color: "text-gray-600" },
  medium: { label: "בינונית", color: "text-blue-600" },
  high: { label: "גבוהה", color: "text-orange-600" },
  critical: { label: "קריטית", color: "text-red-600" }
}

export default function ElevatorsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rows, setRows] = useState<Elevator[]>([])
  const [filteredRows, setFilteredRows] = useState<Elevator[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedElevator, setSelectedElevator] = useState<Elevator | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [elevatorTickets, setElevatorTickets] = useState<Ticket[]>([])
  const [elevatorReports, setElevatorReports] = useState<InspectorReport[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [buildingFilter, setBuildingFilter] = useState("all")
  const [manufacturerFilter, setManufacturerFilter] = useState("all")

  const [form, setForm] = useState<Partial<Elevator>>({
    building_id: "",
    mol_number: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    controller: "",
    install_year: undefined,
    last_pm_date: "",
    last_inspection_date: "",
    // New fields
    load_capacity_kg: undefined,
    load_capacity_persons: undefined,
    speed_mps: undefined,
    stops_count: undefined,
    drive_type: "",
    door_type: ""
  })

  // מיפוי בניין לפי ID
  const buildingsById = useMemo(
    () => Object.fromEntries(
      buildings.map(b => [
        b.id, 
        {
          address: b.address,
          city: b.city,
          entrance: b.entrance,
          fullAddress: `${b.address}${b.entrance ? `, כניסה ${b.entrance}` : ""}, ${b.city}`
        }
      ])
    ), 
    [buildings]
  )

  // מספור מעליות לפי בניין
  const elevatorNumbersByBuilding = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    
    // קבץ מעליות לפי בניין וממיין לפי MOL
    const byBuilding = new Map<string, Elevator[]>()
    rows.forEach(e => {
      if (!byBuilding.has(e.building_id)) {
        byBuilding.set(e.building_id, [])
      }
      byBuilding.get(e.building_id)!.push(e)
    })

    // מספר כל מעלית בבניין
    byBuilding.forEach((elevators, buildingId) => {
      const sorted = elevators.sort((a, b) => a.mol_number.localeCompare(b.mol_number))
      const numbering = new Map<string, number>()
      sorted.forEach((e, idx) => {
        numbering.set(e.id, idx + 1)
      })
      map.set(buildingId, numbering)
    })

    return map
  }, [rows])

  // פונקציה לקבלת מספר המעלית
  const getElevatorNumber = (elevator: Elevator) => {
    const buildingMap = elevatorNumbersByBuilding.get(elevator.building_id)
    return buildingMap?.get(elevator.id) || 1
  }

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // חישוב טיפולים מונעים צפויים החודש
    const pmDueThisMonth = rows.filter(e => {
      if (!e.last_pm_date) return true // אם אין תאריך = דורש טיפול
      
      const lastPM = new Date(e.last_pm_date)
      const nextPM = new Date(lastPM)
      nextPM.setMonth(lastPM.getMonth() + 3) // +3 חודשים
      
      return nextPM.getMonth() === currentMonth && nextPM.getFullYear() === currentYear
    }).length

    // חישוב בדיקות בודק צפויות החודש
    const inspectionsDueThisMonth = rows.filter(e => {
      if (!e.last_inspection_date) return true // אם אין תאריך = דורש בדיקה
      
      const lastInspection = new Date(e.last_inspection_date)
      const nextInspection = new Date(lastInspection)
      nextInspection.setMonth(lastInspection.getMonth() + 6) // +6 חודשים
      
      return nextInspection.getMonth() === currentMonth && nextInspection.getFullYear() === currentYear
    }).length

    return {
      total: rows.length,
      byManufacturer: rows.reduce((acc, e) => {
        const mfr = e.manufacturer || "לא ידוע"
        acc[mfr] = (acc[mfr] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      buildings: new Set(rows.map(e => e.building_id)).size,
      pmDueThisMonth,
      inspectionsDueThisMonth
    }
  }, [rows])

  // Filters
  useEffect(() => {
    let filtered = rows

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.mol_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buildingsById[e.building_id]?.fullAddress.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (buildingFilter !== "all") {
      filtered = filtered.filter(e => e.building_id === buildingFilter)
    }

    if (manufacturerFilter !== "all") {
      filtered = filtered.filter(e => e.manufacturer === manufacturerFilter)
    }

    setFilteredRows(filtered)
  }, [rows, searchTerm, buildingFilter, manufacturerFilter, buildingsById])

  // טעינת נתונים
  const load = async () => {
    setLoading(true)
    try {
      // טען בניינים
      const { data: buildingsData, error: bError } = await supabase
        .from("buildings")
        .select("id, address, city, entrance")
        .order("address", { ascending: true })

      if (bError) throw bError
      setBuildings(buildingsData || [])

      // טען מעליות
      const { data: elevatorsData, error: eError } = await supabase
        .from("elevators")
        .select("id, building_id, mol_number, manufacturer, model, serial_number, controller, install_year, last_pm_date, last_inspection_date")
        .order("mol_number", { ascending: true })

      if (eError) throw eError
      setRows(elevatorsData || [])

    } catch (err: any) {
      toast({
        title: "שגיאה בטעינה",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      building_id: "",
      mol_number: "",
      manufacturer: "",
      model: "",
      serial_number: "",
      controller: "",
      install_year: undefined,
      last_pm_date: "",
      last_inspection_date: "",
      load_capacity_kg: undefined,
      load_capacity_persons: undefined,
      speed_mps: undefined,
      stops_count: undefined,
      drive_type: "",
      door_type: ""
    })
  }

  const save = async () => {
    // בדיקות תקינות
    if (!form.mol_number || form.mol_number.trim() === "") {
      toast({
        title: "שגיאה",
        description: "יש להזין מספר MOL",
        variant: "destructive"
      })
      return
    }

    if (!form.building_id || form.building_id === "") {
      toast({
        title: "שגיאה",
        description: "יש לבחור בניין",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("משתמש לא מחובר")

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (!profile?.company_id) {
        throw new Error("לא נמצא company_id למשתמש")
      }

      const payload = {
        company_id: profile.company_id,
        building_id: form.building_id,
        mol_number: form.mol_number.trim(),
        manufacturer: (form.manufacturer && form.manufacturer !== "unknown") ? form.manufacturer.trim() : null,
        model: form.model?.trim() || null,
        serial_number: form.serial_number?.trim() || null,
        controller: form.controller?.trim() || null,
        install_year: form.install_year ? Number(form.install_year) : null,
        last_pm_date: form.last_pm_date || null,
        last_inspection_date: form.last_inspection_date || null,
        // New fields
        load_capacity_kg: form.load_capacity_kg || null,
        load_capacity_persons: form.load_capacity_persons || null,
        speed_mps: form.speed_mps || null,
        stops_count: form.stops_count || null,
        drive_type: form.drive_type || null,
        door_type: form.door_type || null
      }

      if (editingId) {
        const { error } = await supabase
          .from("elevators")
          .update(payload)
          .eq("id", editingId)

        if (error) throw error
        toast({ title: "המעלית עודכנה בהצלחה" })
      } else {
        const { error } = await supabase
          .from("elevators")
          .insert([payload])

        if (error) throw error
        toast({ title: "המעלית נוספה בהצלחה" })
      }

      setOpen(false)
      resetForm()
      await load()

    } catch (err: any) {
      toast({
        title: "שגיאה",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const editRow = (r: Elevator) => {
    setEditingId(r.id)
    setForm({ ...r })
    setOpen(true)
  }

  const viewDetails = async (r: Elevator) => {
    setSelectedElevator(r)
    setDetailsOpen(true)
    setLoadingDetails(true)
    
    try {
      // טען קריאות שירות
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, title, status, severity, created_at')
        .eq('elevator_id', r.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (ticketsError) throw ticketsError
      setElevatorTickets(ticketsData || [])

      // טען דוחות בודק
      const { data: reportsData, error: reportsError } = await supabase
        .from('inspector_reports')
        .select('id, report_date, items_section_7, items_section_9, inspector_name')
        .eq('elevator_id', r.id)
        .order('report_date', { ascending: false })
        .limit(10)

      if (reportsError) throw reportsError
      setElevatorReports(reportsData || [])

    } catch (err: any) {
      console.error('Error loading elevator details:', err)
      toast({
        title: "שגיאה בטעינת פרטים",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const getNextInspectionDate = (lastDate: string | null): Date | null => {
    if (!lastDate) return null
    const last = new Date(lastDate)
    const next = new Date(last)
    next.setMonth(last.getMonth() + 6)
    return next
  }

  const getDaysUntilInspection = (lastDate: string | null): number | null => {
    const nextDate = getNextInspectionDate(lastDate)
    if (!nextDate) return null
    const today = new Date()
    const diff = nextDate.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "היום"
    if (diffDays === 1) return "אתמול"
    if (diffDays < 7) return `לפני ${diffDays} ימים`
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`
    if (diffDays < 365) return `לפני ${Math.floor(diffDays / 30)} חודשים`
    return `לפני ${Math.floor(diffDays / 365)} שנים`
  }

  const deleteRow = async (id: string) => {
    // פונקציה זו נשארת אבל לא תיקרא מהכרטיסים
    // רק מעמוד הבניין
    if (!confirm("למחוק את המעלית? הפעולה בלתי הפיכה")) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("elevators")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast({ title: "המעלית נמחקה בהצלחה" })
      await load()

    } catch (err: any) {
      toast({
        title: "שגיאה במחיקה",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">מעליות</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ניהול מעליות החברה • {stats.total} מעליות
            </p>
          </div>
          
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                מעלית חדשה
              </Button>
            </DialogTrigger>

            <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "עריכת מעלית" : "מעלית חדשה"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* מספר MOL - חובה */}
                <div>
                  <Label htmlFor="mol_number" className="flex items-center gap-1">
                    מספר MOL <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mol_number"
                    value={form.mol_number || ""}
                    onChange={(e) => setForm({ ...form, mol_number: e.target.value })}
                    placeholder="12345/67890"
                    dir="ltr"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">פורמט: XXXXX/XXXXX (מספר רישוי ממשרד העבודה)</p>
                </div>

                {/* בניין - חובה */}
                <div>
                  <Label className="flex items-center gap-1">
                    בניין <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.building_id || ""}
                    onValueChange={(val) => setForm({ ...form, building_id: val })}
                  >
                    <SelectTrigger className={!form.building_id ? "border-red-300" : ""}>
                      <SelectValue placeholder="בחר בניין" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          <Building2 className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                          <p>אין בניינים במערכת</p>
                          <p className="text-xs mt-1">צור בניין חדש בעמוד "בניינים"</p>
                        </div>
                      ) : (
                        buildings.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {buildingsById[b.id]?.fullAddress}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* יצרן */}
                <div>
                  <Label htmlFor="manufacturer">יצרן</Label>
                  <Select
                    value={form.manufacturer || "unknown"}
                    onValueChange={(val) => setForm({ ...form, manufacturer: val === "unknown" ? "" : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר יצרן (אופציונלי)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">— ללא —</SelectItem>
                      {MANUFACTURERS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* פרטים נוספים */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="model">דגם</Label>
                    <Input
                      id="model"
                      value={form.model || ""}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="Gen2, 3300..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="serial_number">מס׳ סידורי</Label>
                    <Input
                      id="serial_number"
                      value={form.serial_number || ""}
                      onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                      placeholder="SN123456"
                      dir="ltr"
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="controller">בקר</Label>
                    <Input
                      id="controller"
                      value={form.controller || ""}
                      onChange={(e) => setForm({ ...form, controller: e.target.value })}
                      placeholder="Monarch, SMR..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="install_year">שנת התקנה</Label>
                    <Input
                      id="install_year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={form.install_year ?? ""}
                      onChange={(e) => setForm({
                        ...form,
                        install_year: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="2020"
                      dir="ltr"
                    />
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Technical Specifications Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    מפרטים טכניים
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Load Capacity (kg) */}
                    <div>
                      <Label htmlFor="load_capacity_kg">משקל מקסימלי (ק&quot;ג)</Label>
                      <Input
                        id="load_capacity_kg"
                        type="number"
                        min="100"
                        max="10000"
                        step="50"
                        value={form.load_capacity_kg || ""}
                        onChange={(e) => setForm({ ...form, load_capacity_kg: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="לדוגמה: 630"
                      />
                      <p className="text-xs text-gray-500 mt-1">טווח נפוץ: 320-2000 ק&quot;ג</p>
                    </div>

                    {/* Load Capacity (persons) */}
                    <div>
                      <Label htmlFor="load_capacity_persons">מספר נוסעים</Label>
                      <Input
                        id="load_capacity_persons"
                        type="number"
                        min="2"
                        max="32"
                        value={form.load_capacity_persons || ""}
                        onChange={(e) => setForm({ ...form, load_capacity_persons: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="לדוגמה: 8"
                      />
                      <p className="text-xs text-gray-500 mt-1">טווח נפוץ: 4-13 נוסעים</p>
                    </div>

                    {/* Speed (m/s) */}
                    <div>
                      <Label htmlFor="speed_mps">מהירות (m/s)</Label>
                      <Input
                        id="speed_mps"
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={form.speed_mps || ""}
                        onChange={(e) => setForm({ ...form, speed_mps: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="לדוגמה: 1.0"
                      />
                      <p className="text-xs text-gray-500 mt-1">טווח נפוץ: 0.63-2.5 m/s</p>
                    </div>

                    {/* Stops Count */}
                    <div>
                      <Label htmlFor="stops_count">מספר תחנות</Label>
                      <Input
                        id="stops_count"
                        type="number"
                        min="2"
                        max="100"
                        value={form.stops_count || ""}
                        onChange={(e) => setForm({ ...form, stops_count: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="לדוגמה: 8"
                      />
                      <p className="text-xs text-gray-500 mt-1">כולל קרקע + קומות</p>
                    </div>

                    {/* Drive Type */}
                    <div>
                      <Label htmlFor="drive_type">סוג הנעה</Label>
                      <Select
                        value={form.drive_type || ""}
                        onValueChange={(value) => setForm({ ...form, drive_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג הנעה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="traction">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              <span>משיכה (Traction)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="hydraulic">
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4" />
                              <span>הידראולי (Hydraulic)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="mrl">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span>ללא חדר מכונות (MRL)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="vacuum">
                            <div className="flex items-center gap-2">
                              <Wind className="h-4 w-4" />
                              <span>ואקום (Vacuum)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Door Type */}
                    <div>
                      <Label htmlFor="door_type">סוג דלת</Label>
                      <Select
                        value={form.door_type || ""}
                        onValueChange={(value) => setForm({ ...form, door_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג דלת" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center_opening">
                            <div className="flex items-center gap-2">
                              <DoorOpen className="h-4 w-4" />
                              <span>פתיחה מרכזית</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="side_sliding">
                            <div className="flex items-center gap-2">
                              <MoveHorizontal className="h-4 w-4" />
                              <span>הזזה צדדית</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="telescopic">
                            <div className="flex items-center gap-2">
                              <Maximize2 className="h-4 w-4" />
                              <span>טלסקופית</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="swing">
                            <div className="flex items-center gap-2">
                              <RotateCw className="h-4 w-4" />
                              <span>כנף (Swing)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Info Box */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800 dark:text-blue-200">
                      <p className="font-semibold mb-1">💡 עצה:</p>
                      <p>המפרטים הטכניים עוזרים לזהות מעליות במהירות, לתכנן טיפולים, ולהבין יכולות המעלית.</p>
                    </div>
                  </div>
                </div>

                {/* כפתורים */}
                <div className="pt-2 flex gap-2 justify-end border-t">
                  <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>
                    ביטול
                  </Button>
                  <Button onClick={save} disabled={loading || buildings.length === 0}>
                    {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                    {editingId ? "שמור" : "צור מעלית"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">סה"כ מעליות</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">טיפולים מונעים</CardTitle>
              <Wrench className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pmDueThisMonth}</div>
              <p className="text-xs text-muted-foreground">צפויים החודש</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">בדיקות בודק</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inspectionsDueThisMonth}</div>
              <p className="text-xs text-muted-foreground">צפויות החודש</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">בניינים</CardTitle>
              <Building2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.buildings}</div>
              <p className="text-xs text-muted-foreground">מיקומים פעילים</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי MOL, יצרן, דגם או כתובת..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              {/* Building Filter */}
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="בניין" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הבניינים</SelectItem>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {buildingsById[b.id]?.fullAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Manufacturer Filter */}
              <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="יצרן" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל היצרנים</SelectItem>
                  {Object.keys(stats.byManufacturer).map(m => (
                    <SelectItem key={m} value={m}>
                      {m} ({stats.byManufacturer[m]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Elevators Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Wrench className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || buildingFilter !== "all" || manufacturerFilter !== "all"
                  ? "לא נמצאו מעליות"
                  : "אין מעליות עדיין"
                }
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || buildingFilter !== "all" || manufacturerFilter !== "all"
                  ? "נסה לשנות את המסננים או החיפוש"
                  : "התחל ביצירת מעלית ראשונה"
                }
              </p>
              <Button onClick={() => setOpen(true)} disabled={buildings.length === 0}>
                <Plus className="w-4 h-4 ml-2" />
                {buildings.length === 0 ? "צור בניין קודם" : "מעלית ראשונה"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRows.map((elevator) => {
              const building = buildingsById[elevator.building_id]
              const elevatorNum = getElevatorNumber(elevator)
              const daysUntilInspection = getDaysUntilInspection(elevator.last_inspection_date)
              const isInspectionUrgent = daysUntilInspection !== null && daysUntilInspection <= 14 && daysUntilInspection > 0

              return (
                <Card 
                  key={elevator.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => viewDetails(elevator)}
                >
                  <CardContent className="p-6">
                    {/* Warning Banner */}
                    {isInspectionUrgent && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-800">
                          <strong>נותרו {daysUntilInspection} ימים</strong> לביצוע בדיקת בודק הבאה
                        </p>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-sm">
                            <Hash className="h-3 w-3 ml-1" />
                            {elevatorNum}
                          </Badge>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            מעלית {elevatorNum}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                          <MapPin className="h-3 w-3" />
                          {building?.fullAddress || "—"}
                        </p>
                        <p className="text-xs font-mono text-gray-500" dir="ltr">
                          MOL: {elevator.mol_number}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {elevator.manufacturer || "לא ידוע"}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm mb-4">
                      {elevator.model && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">דגם:</span>
                          <span className="font-medium">{elevator.model}</span>
                        </div>
                      )}
                      {elevator.serial_number && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">מס' סידורי:</span>
                          <span className="font-mono text-xs">{elevator.serial_number}</span>
                        </div>
                      )}
                      {elevator.install_year && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">שנת התקנה:</span>
                          <span className="font-medium">{elevator.install_year}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          viewDetails(elevator)
                        }}
                      >
                        <FileText className="h-3 w-3 ml-1" />
                        פרטים
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          editRow(elevator)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedElevator && (() => {
            const building = buildingsById[selectedElevator.building_id]
            const elevatorNum = getElevatorNumber(selectedElevator)
            const daysUntilInspection = getDaysUntilInspection(selectedElevator.last_inspection_date)
            const nextInspectionDate = getNextInspectionDate(selectedElevator.last_inspection_date)
            const isInspectionUrgent = daysUntilInspection !== null && daysUntilInspection <= 14 && daysUntilInspection > 0

            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        מעלית {elevatorNum}
                      </DialogTitle>
                      <DialogDescription className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4" />
                        {building?.fullAddress}
                      </DialogDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {selectedElevator.manufacturer || "לא ידוע"}
                    </Badge>
                  </div>
                </DialogHeader>

                {/* Warning Banner */}
                {isInspectionUrgent && (
                  <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900 mb-1">
                        בדיקת בודק מתקרבת!
                      </p>
                      <p className="text-sm text-orange-800">
                        נותרו <strong>{daysUntilInspection} ימים</strong> לבדיקה הבאה (
                        {nextInspectionDate?.toLocaleDateString('he-IL')}
                        ). יש לתאם עם בודק ממשרד העבודה.
                      </p>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Details Grid */}
                <div className="space-y-6">
                  {/* MOL Number */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                      מספר MOL (רישוי משרד העבודה)
                    </label>
                    <code className="text-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded font-mono text-gray-900 dark:text-gray-100 block">
                      {selectedElevator.mol_number}
                    </code>
                  </div>

                  {/* Technical Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      פרטים טכניים
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                          יצרן
                        </label>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedElevator.manufacturer || "—"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                          דגם
                        </label>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedElevator.model || "—"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                          מספר סידורי
                        </label>
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                          {selectedElevator.serial_number || "—"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                          בקר
                        </label>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedElevator.controller || "—"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                          שנת התקנה
                        </label>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedElevator.install_year || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Schedule */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      לוח תחזוקה
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              טיפול מונע אחרון
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              תדירות: כל 3 חודשים
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            {selectedElevator.last_pm_date 
                              ? new Date(selectedElevator.last_pm_date).toLocaleDateString('he-IL')
                              : "טרם בוצע"
                            }
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                              בדיקת בודק אחרונה
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                              תדירות: כל 6 חודשים • הבאה: {nextInspectionDate?.toLocaleDateString('he-IL') || "לא ידוע"}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                            {selectedElevator.last_inspection_date 
                              ? new Date(selectedElevator.last_inspection_date).toLocaleDateString('he-IL')
                              : "טרם בוצעה"
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tickets History */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      קריאות שירות ({elevatorTickets.length})
                    </h3>
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : elevatorTickets.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          אין קריאות שירות עדיין
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {elevatorTickets.map(ticket => {
                          const statusConfig = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: "bg-gray-500" }
                          const severityConfig = SEVERITY_CONFIG[ticket.severity] || { label: ticket.severity, color: "text-gray-600" }
                          
                          return (
                            <Link 
                              key={ticket.id}
                              href={`/tickets?id=${ticket.id}`}
                              className="block"
                            >
                              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                      {ticket.title}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {getRelativeTime(ticket.created_at)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge className={`${statusConfig.color} text-white text-xs`}>
                                      {statusConfig.label}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${severityConfig.color}`}>
                                    {severityConfig.label}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Inspector Reports History */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      דוחות בודק ({elevatorReports.length})
                    </h3>
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : elevatorReports.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          אין דוחות בודק עדיין
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {elevatorReports.map(report => {
                          const section7Count = Array.isArray(report.items_section_7) ? report.items_section_7.length : 0
                          const section9Count = Array.isArray(report.items_section_9) ? report.items_section_9.length : 0
                          const hasIssues = section7Count > 0
                          
                          return (
                            <div 
                              key={report.id} 
                              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                      {new Date(report.report_date).toLocaleDateString('he-IL', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric' 
                                      })}
                                    </p>
                                    {hasIssues ? (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 ml-1" />
                                        {section7Count} תיקונים
                                      </Badge>
                                    ) : (
                                      <Badge variant="done" className="text-xs">
                                        <CheckCircle className="h-3 w-3 ml-1" />
                                        תקין
                                      </Badge>
                                    )}
                                  </div>
                                  {report.inspector_name && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      בודק: {report.inspector_name}
                                    </p>
                                  )}
                                  {section9Count > 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {section9Count} הערות למעקב
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <Separator />
                  <div className="flex gap-3 justify-end pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setDetailsOpen(false)}
                    >
                      סגור
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setDetailsOpen(false)
                      editRow(selectedElevator)
                    }}>
                      <Pencil className="w-4 h-4 ml-2" />
                      ערוך
                    </Button>
                    <Button>
                      <FileText className="w-4 h-4 ml-2" />
                      דוחות בודק
                    </Button>
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  )
}