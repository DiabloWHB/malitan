"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Loader2,
  Plus,
  Pencil,
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Wrench,
  AlertCircle,
  Search,
  Hash,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Paperclip,
  Briefcase,
  Key
} from "lucide-react"

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
}

type Building = {
  id: string
  client_id: string
  address: string
  street: string
  house_number: string
  city: string
  entrance: string | null
  notes: string | null
  // New fields
  floors?: number | null
  apartments?: number | null
  build_year?: number | null
  building_type?: string | null
  access_code?: string | null
  key_location?: string | null
  parking_available?: boolean
  parking_info?: string | null
}

type Elevator = {
  id: string
  mol_number: string
  manufacturer: string | null
  model: string | null
  last_inspection_date: string | null
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

type Attachment = {
  id: string
  file_name: string
  file_type: string
  file_size: number
  created_at: string
}

// רשימת ערים בישראל
const ISRAELI_CITIES = [
  "תל אביב-יפו", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "חולון",
  "רמת גן", "אשקלון", "רחובות", "בת ים", "כפר סבא",
  "חדרה", "מודיעין-מכבים-רעות", "נצרת", "רמלה", "לוד"
]

// רשימת רחובות נפוצים
const COMMON_STREETS = [
  "הרצל", "בן גוריון", "ויצמן", "רוטשילד", "דיזנגוף",
  "אלנבי", "ז'בוטינסקי", "ביאליק", "אחד העם", "שינקין"
]

// קונפיג סטטוס
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

export default function BuildingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [rows, setRows] = useState<Building[]>([])
  const [filteredRows, setFilteredRows] = useState<Building[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Site Hub Data
  const [buildingElevators, setBuildingElevators] = useState<Elevator[]>([])
  const [buildingTickets, setBuildingTickets] = useState<Ticket[]>([])
  const [buildingReports, setBuildingReports] = useState<InspectorReport[]>([])
  const [buildingAttachments, setBuildingAttachments] = useState<Attachment[]>([])
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [cityFilter, setCityFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")

  const [form, setForm] = useState<Partial<Building>>({
    client_id: "",
    street: "",
    house_number: "",
    city: "",
    entrance: "",
    notes: "",
    // New fields
    floors: undefined,
    apartments: undefined,
    build_year: undefined,
    building_type: "",
    access_code: "",
    key_location: "",
    parking_available: false,
    parking_info: ""
  })

  // מיפוי לקוחות
  const clientsById = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c])),
    [clients]
  )

  // Stats
  const stats = useMemo(() => {
    const uniqueCities = new Set(rows.map(b => b.city)).size
    const uniqueClients = new Set(rows.map(b => b.client_id)).size

    return {
      total: rows.length,
      cities: uniqueCities,
      clients: uniqueClients,
      activeProjects: 0 // TODO: חבר לפרויקטים
    }
  }, [rows])

  // Unique cities list for filter dropdown
  const uniqueCities = useMemo(() => {
    return Array.from(new Set(rows.map(b => b.city).filter(Boolean))).sort()
  }, [rows])

  // Filters
  useEffect(() => {
    let filtered = rows

    if (searchTerm) {
      filtered = filtered.filter(b =>
        b.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientsById[b.client_id]?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (cityFilter !== "all") {
      filtered = filtered.filter(b => b.city === cityFilter)
    }

    if (clientFilter !== "all") {
      filtered = filtered.filter(b => b.client_id === clientFilter)
    }

    setFilteredRows(filtered)
  }, [rows, searchTerm, cityFilter, clientFilter, clientsById])

  const load = async () => {
    setLoading(true)
    try {
      // טען לקוחות
      const { data: clientsData, error: cError } = await supabase
        .from("clients")
        .select("id, name, email, phone")
        .order("name", { ascending: true })

      if (cError) throw cError
      setClients(clientsData || [])

      // טען בניינים
      const { data: buildingsData, error: bError } = await supabase
        .from("buildings")
        .select("id, client_id, address, street, house_number, city, entrance, notes")
        .order("city", { ascending: true })

      if (bError) throw bError
      setRows(buildingsData || [])

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
      client_id: "",
      street: "",
      house_number: "",
      city: "",
      entrance: "",
      notes: "",
      floors: undefined,
      apartments: undefined,
      build_year: undefined,
      building_type: "",
      access_code: "",
      key_location: "",
      parking_available: false,
      parking_info: ""
    })
  }

  const save = async () => {
    if (!form.client_id || form.client_id === "") {
      toast({
        title: "שגיאה",
        description: "יש לבחור לקוח",
        variant: "destructive"
      })
      return
    }

    if (!form.street || !form.house_number || !form.city) {
      toast({
        title: "שגיאה",
        description: "יש למלא כתובת מלאה",
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

      if (!profile?.company_id) throw new Error("לא נמצא company_id")

      const fullAddress = `${form.street} ${form.house_number}${form.entrance ? `, כניסה ${form.entrance}` : ""}`

      const payload = {
        company_id: profile.company_id,
        client_id: form.client_id,
        address: fullAddress,
        street: form.street.trim(),
        house_number: form.house_number.trim(),
        city: form.city.trim(),
        entrance: form.entrance?.trim() || null,
        notes: form.notes?.trim() || null,
        // New fields
        floors: form.floors || null,
        apartments: form.apartments || null,
        build_year: form.build_year || null,
        building_type: form.building_type || null,
        access_code: form.access_code?.trim() || null,
        key_location: form.key_location?.trim() || null,
        parking_available: form.parking_available || false,
        parking_info: form.parking_info?.trim() || null
      }

      if (editingId) {
        const { error } = await supabase
          .from("buildings")
          .update(payload)
          .eq("id", editingId)

        if (error) throw error
        toast({ title: "הבניין עודכן בהצלחה" })
      } else {
        const { error } = await supabase
          .from("buildings")
          .insert([payload])

        if (error) throw error
        toast({ title: "הבניין נוסף בהצלחה" })
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

  const editRow = (r: Building) => {
    setEditingId(r.id)
    setForm({
      client_id: r.client_id,
      street: r.street,
      house_number: r.house_number,
      city: r.city,
      entrance: r.entrance || "",
      notes: r.notes || "",
      // New fields
      floors: r.floors,
      apartments: r.apartments,
      build_year: r.build_year,
      building_type: r.building_type || "",
      access_code: r.access_code || "",
      key_location: r.key_location || "",
      parking_available: r.parking_available || false,
      parking_info: r.parking_info || ""
    })
    setOpen(true)
  }

  const viewDetails = async (building: Building) => {
    setSelectedBuilding(building)
    setDetailsOpen(true)
    setLoadingDetails(true)
    
    try {
      // טען מעליות
      const { data: elevatorsData, error: eError } = await supabase
        .from('elevators')
        .select('id, mol_number, manufacturer, model, last_inspection_date')
        .eq('building_id', building.id)
        .order('mol_number', { ascending: true })

      if (eError) throw eError
      setBuildingElevators(elevatorsData || [])

      // טען קריאות
      const { data: ticketsData, error: tError } = await supabase
        .from('tickets')
        .select('id, title, status, severity, created_at')
        .eq('building_id', building.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (tError) throw tError
      setBuildingTickets(ticketsData || [])

      // טען דוחות בודק
      const { data: reportsData, error: rError } = await supabase
        .from('inspector_reports')
        .select('id, report_date, items_section_7, items_section_9, inspector_name')
        .eq('building_id', building.id)
        .order('report_date', { ascending: false })
        .limit(10)

      if (rError) throw rError
      setBuildingReports(reportsData || [])

      // טען קבצים
      const { data: attachmentsData, error: aError } = await supabase
        .from('attachments')
        .select('id, file_name, file_type, file_size, created_at')
        .eq('building_id', building.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (aError) throw aError
      setBuildingAttachments(attachmentsData || [])

    } catch (err: any) {
      console.error('Error loading building details:', err)
      toast({
        title: "שגיאה בטעינת פרטים",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoadingDetails(false)
    }
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">בניינים</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ניהול בניינים ומיקומים • {stats.total} בניינים
            </p>
          </div>
          
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                בניין חדש
              </Button>
            </DialogTrigger>

            <DialogContent dir="rtl" className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "עריכת בניין" : "בניין חדש"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* לקוח - חובה! */}
                <div>
                  <Label htmlFor="client" className="flex items-center gap-1">
                    לקוח (ועד/חברת ניהול) 
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.client_id || ""}
                    onValueChange={(val) => setForm({ ...form, client_id: val })}
                    required
                  >
                    <SelectTrigger id="client" className={!form.client_id ? "border-red-300" : ""}>
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                          <p>אין לקוחות במערכת</p>
                          <p className="text-xs mt-1">צור לקוח חדש בעמוד "לקוחות"</p>
                        </div>
                      ) : (
                        clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    כל בניין חייב להיות משויך ללקוח (ועד בית / חברת ניהול)
                  </p>
                </div>

                {/* עיר */}
                <div>
                  <Label htmlFor="city" className="flex items-center gap-1">
                    עיר <span className="text-red-500">*</span>
                  </Label>
                  <Autocomplete
                    id="city"
                    value={form.city || ""}
                    onValueChange={(val) => setForm({ ...form, city: val })}
                    suggestions={ISRAELI_CITIES}
                    placeholder="הקלד שם עיר..."
                    emptyText="לא נמצאו ערים"
                  />
                </div>

                {/* רחוב ומספר בית */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="street" className="flex items-center gap-1">
                      רחוב <span className="text-red-500">*</span>
                    </Label>
                    <Autocomplete
                      id="street"
                      value={form.street || ""}
                      onValueChange={(val) => setForm({ ...form, street: val })}
                      suggestions={COMMON_STREETS}
                      placeholder="הקלד שם רחוב..."
                      emptyText="לא נמצאו רחובות"
                    />
                  </div>
                  <div>
                    <Label htmlFor="house_number" className="flex items-center gap-1">
                      מספר <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="house_number"
                      value={form.house_number || ""}
                      onChange={(e) => setForm({ ...form, house_number: e.target.value })}
                      placeholder="123"
                    />
                  </div>
                </div>

                {/* כניסה */}
                <div>
                  <Label htmlFor="entrance">כניסה</Label>
                  <Input
                    id="entrance"
                    value={form.entrance || ""}
                    onChange={(e) => setForm({ ...form, entrance: e.target.value })}
                    placeholder="א׳, ב׳, ג׳..."
                  />
                </div>

                {/* הערות */}
                <div>
                  <Label htmlFor="notes">הערות</Label>
                  <Textarea
                    id="notes"
                    value={form.notes || ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="מידע נוסף על הבניין..."
                    rows={3}
                  />
                </div>

                <Separator className="my-4" />

                {/* Building Details Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    פרטי בניין
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Floors */}
                    <div>
                      <Label htmlFor="floors">מספר קומות</Label>
                      <Input
                        id="floors"
                        type="number"
                        min="1"
                        value={form.floors || ""}
                        onChange={(e) => setForm({ ...form, floors: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="לדוגמה: 8"
                      />
                    </div>

                    {/* Apartments */}
                    <div>
                      <Label htmlFor="apartments">מספר דירות</Label>
                      <Input
                        id="apartments"
                        type="number"
                        min="1"
                        value={form.apartments || ""}
                        onChange={(e) => setForm({ ...form, apartments: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="לדוגמה: 24"
                      />
                    </div>

                    {/* Build Year */}
                    <div>
                      <Label htmlFor="build_year">שנת בנייה</Label>
                      <Input
                        id="build_year"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={form.build_year || ""}
                        onChange={(e) => setForm({ ...form, build_year: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="לדוגמה: 1985"
                      />
                    </div>

                    {/* Building Type */}
                    <div>
                      <Label htmlFor="building_type">סוג בניין</Label>
                      <Select
                        value={form.building_type || ""}
                        onValueChange={(value) => setForm({ ...form, building_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג בניין" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">מגורים</SelectItem>
                          <SelectItem value="commercial">מסחרי</SelectItem>
                          <SelectItem value="mixed">מעורב</SelectItem>
                          <SelectItem value="industrial">תעשייה</SelectItem>
                          <SelectItem value="public">ציבורי</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Access & Security Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    גישה ואבטחה
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Access Code */}
                    <div>
                      <Label htmlFor="access_code">קוד כניסה</Label>
                      <Input
                        id="access_code"
                        value={form.access_code || ""}
                        onChange={(e) => setForm({ ...form, access_code: e.target.value })}
                        placeholder="לדוגמה: 1234#"
                        dir="ltr"
                      />
                    </div>

                    {/* Key Location */}
                    <div>
                      <Label htmlFor="key_location">מיקום מפתחות</Label>
                      <Input
                        id="key_location"
                        value={form.key_location || ""}
                        onChange={(e) => setForm({ ...form, key_location: e.target.value })}
                        placeholder="לדוגמה: אצל דייר בקומה 1"
                      />
                    </div>
                  </div>

                  {/* Parking */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="parking_available"
                        checked={form.parking_available || false}
                        onCheckedChange={(checked) => setForm({ ...form, parking_available: checked as boolean })}
                      />
                      <Label htmlFor="parking_available" className="cursor-pointer">
                        חניה זמינה
                      </Label>
                    </div>

                    {form.parking_available && (
                      <Input
                        id="parking_info"
                        value={form.parking_info || ""}
                        onChange={(e) => setForm({ ...form, parking_info: e.target.value })}
                        placeholder="פרטים על החניה (תת קרקעי, רחוב, מספר מקומות...)"
                      />
                    )}
                  </div>
                </div>

                {/* כפתורים */}
                <div className="pt-2 flex gap-2 justify-end border-t">
                  <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>
                    ביטול
                  </Button>
                  <Button onClick={save} disabled={loading || clients.length === 0}>
                    {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                    {editingId ? "שמור" : "צור בניין"}
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
              <CardTitle className="text-sm font-medium">סה"כ בניינים</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">פרויקטים פעילים</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">שיפוצים בביצוע</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">לקוחות</CardTitle>
              <User className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clients}</div>
              <p className="text-xs text-muted-foreground">ועדים וחברות</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ערים</CardTitle>
              <MapPin className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cities}</div>
              <p className="text-xs text-muted-foreground">מיקומים שונים</p>
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
                  placeholder="חיפוש לפי רחוב, עיר, מספר בית או לקוח..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              {/* City Filter */}
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="עיר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הערים</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Client Filter */}
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="לקוח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הלקוחות</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Buildings Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || cityFilter !== "all" || clientFilter !== "all"
                  ? "לא נמצאו בניינים"
                  : "אין בניינים עדיין"
                }
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || cityFilter !== "all" || clientFilter !== "all"
                  ? "נסה לשנות את המסננים או החיפוש"
                  : "התחל ביצירת בניין ראשון"
                }
              </p>
              <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
                <Plus className="w-4 h-4 ml-2" />
                {clients.length === 0 ? "צור לקוח קודם" : "בניין ראשון"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRows.map((building) => (
              <Card 
                key={building.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => viewDetails(building)}
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {building.street} {building.house_number}
                        {building.entrance && `, כניסה ${building.entrance}`}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {building.city}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <User className="h-3 w-3 ml-1" />
                      {clientsById[building.client_id]?.name || "—"}
                    </Badge>
                  </div>

                  {/* Notes */}
                  {building.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {building.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        viewDetails(building)
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
                        editRow(building)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Site Hub Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedBuilding && (() => {
            const client = clientsById[selectedBuilding.client_id]
            const activeTickets = buildingTickets.filter(t => 
              t.status !== 'done' && t.status !== 'cancelled'
            ).length

            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {selectedBuilding.street} {selectedBuilding.house_number}
                        {selectedBuilding.entrance && `, כניסה ${selectedBuilding.entrance}`}
                      </DialogTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {selectedBuilding.city}
                        </span>
                        {client && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {client.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <Link href={`/site-hub?building=${selectedBuilding.id}`}>
                        <ExternalLink className="h-4 w-4 ml-2" />
                        הגדל מסך
                      </Link>
                    </Button>
                  </div>
                </DialogHeader>

                <Separator className="my-4" />

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">מעליות</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {buildingElevators.length}
                          </p>
                        </div>
                        <Wrench className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">קריאות פעילות</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {activeTickets}
                          </p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">דוחות בודק</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {buildingReports.length}
                          </p>
                        </div>
                        <FileText className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">קבצים</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {buildingAttachments.length}
                          </p>
                        </div>
                        <Paperclip className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="elevators" className="flex-1 overflow-hidden flex flex-col">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="elevators">
                      <Wrench className="h-4 w-4 ml-2" />
                      מעליות
                    </TabsTrigger>
                    <TabsTrigger value="tickets">
                      <AlertCircle className="h-4 w-4 ml-2" />
                      קריאות
                    </TabsTrigger>
                    <TabsTrigger value="reports">
                      <FileText className="h-4 w-4 ml-2" />
                      דוחות בודק
                    </TabsTrigger>
                    <TabsTrigger value="files">
                      <Paperclip className="h-4 w-4 ml-2" />
                      קבצים
                    </TabsTrigger>
                  </TabsList>

                  {/* Elevators Tab */}
                  <TabsContent value="elevators" className="flex-1 overflow-y-auto">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : buildingElevators.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          אין מעליות בבניין זה
                        </p>
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 ml-2" />
                          הוסף מעלית
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {buildingElevators.map((elevator, idx) => (
                          <Card key={elevator.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">
                                      <Hash className="h-3 w-3 ml-1" />
                                      {idx + 1}
                                    </Badge>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                      מעלית {idx + 1}
                                    </h4>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mb-1">
                                    MOL: {elevator.mol_number}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>{elevator.manufacturer || "—"}</span>
                                    {elevator.model && <span>{elevator.model}</span>}
                                  </div>
                                </div>
                                {elevator.last_inspection_date && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="h-3 w-3 ml-1" />
                                    {new Date(elevator.last_inspection_date).toLocaleDateString('he-IL')}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Tickets Tab */}
                  <TabsContent value="tickets" className="flex-1 overflow-y-auto">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : buildingTickets.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          אין קריאות שירות לבניין זה
                        </p>
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 ml-2" />
                          קריאה חדשה
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {buildingTickets.map(ticket => {
                          const statusConfig = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: "bg-gray-500" }
                          const severityConfig = SEVERITY_CONFIG[ticket.severity] || { label: ticket.severity, color: "text-gray-600" }
                          
                          return (
                            <Card key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                                      {ticket.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {getRelativeTime(ticket.created_at)}
                                    </p>
                                  </div>
                                  <Badge className={`${statusConfig.color} text-white shrink-0`}>
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${severityConfig.color}`}>
                                    {severityConfig.label}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Reports Tab */}
                  <TabsContent value="reports" className="flex-1 overflow-y-auto">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : buildingReports.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          אין דוחות בודק לבניין זה
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {buildingReports.map(report => {
                          const section7Count = Array.isArray(report.items_section_7) ? report.items_section_7.length : 0
                          const section9Count = Array.isArray(report.items_section_9) ? report.items_section_9.length : 0
                          const hasIssues = section7Count > 0
                          
                          return (
                            <Card key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                        {new Date(report.report_date).toLocaleDateString('he-IL', { 
                                          day: '2-digit', 
                                          month: '2-digit', 
                                          year: 'numeric' 
                                        })}
                                      </h4>
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
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        בודק: {report.inspector_name}
                                      </p>
                                    )}
                                    {section9Count > 0 && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {section9Count} הערות למעקב
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Files Tab */}
                  <TabsContent value="files" className="flex-1 overflow-y-auto">
                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : buildingAttachments.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Paperclip className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          אין קבצים מצורפים לבניין זה
                        </p>
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 ml-2" />
                          העלה קובץ
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {buildingAttachments.map(file => (
                          <Card key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <Paperclip className="h-5 w-5 text-gray-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {file.file_name}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{formatFileSize(file.file_size)}</span>
                                    <span>{getRelativeTime(file.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Actions */}
                <Separator className="my-4" />
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                    סגור
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setDetailsOpen(false)
                    editRow(selectedBuilding)
                  }}>
                    <Pencil className="w-4 h-4 ml-2" />
                    ערוך בניין
                  </Button>
                  <Button>
                    <Plus className="w-4 h-4 ml-2" />
                    קריאה חדשה
                  </Button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}