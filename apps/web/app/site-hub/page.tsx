"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { 
  Loader2,
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Mail,
  Wrench,
  AlertCircle,
  FileText,
  Paperclip,
  Plus,
  Hash,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Edit,
  ExternalLink,
  Building2,
  Key,
  Car,
  Info,
  MessageSquare,
  Gauge,
  Weight
} from "lucide-react"

type Building = {
  id: string
  client_id: string
  address: string
  street: string
  house_number: string
  city: string
  entrance: string | null
  notes: string | null
  floors?: number
  apartments?: number
  build_year?: number
  building_type?: string
  access_code?: string
  key_location?: string
  parking_available?: boolean
  parking_info?: string
}

type Client = {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  contact_name: string | null
}

type Elevator = {
  id: string
  mol_number: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  controller: string | null
  install_year: number | null
  last_pm_date: string | null
  last_inspection_date: string | null
  load_capacity_kg?: number
  load_capacity_persons?: number
  speed_mps?: number
  stops_count?: number
  door_type?: string
  drive_type?: string
}

type Ticket = {
  id: string
  title: string
  description: string | null
  status: string
  severity: string
  created_at: string
  updated_at: string
}

type InspectorReport = {
  id: string
  elevator_id: string | null
  report_date: string
  inspector_name: string | null
  next_inspection_date: string | null
  file_name: string | null
  mol_number: string | null
}

type Attachment = {
  id: string
  file_name: string
  file_type: string
  file_size: number
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "חדש", color: "bg-purple-500" },
  assigned: { label: "שוייך", color: "bg-blue-500" },
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

const DRIVE_TYPE_LABELS: Record<string, string> = {
  traction: "משיכה (Traction)",
  hydraulic: "הידראולי",
  mrl: "ללא חדר מכונות (MRL)",
  vacuum: "ואקום"
}

const DOOR_TYPE_LABELS: Record<string, string> = {
  center_opening: "פתיחה מרכזית",
  side_sliding: "הזזה צדדית",
  telescopic: "טלסקופית",
  swing: "כנף"
}

function SiteHubContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const buildingId = searchParams.get("building")
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState<Building | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [elevators, setElevators] = useState<Elevator[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [reports, setReports] = useState<InspectorReport[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  
  // Filter for tickets
  const [ticketFilter, setTicketFilter] = useState<"all" | "active" | "completed">("active")

  useEffect(() => {
    if (!buildingId) {
      toast({
        title: "שגיאה",
        description: "לא נמצא מזהה בניין",
        variant: "destructive"
      })
      router.push("/buildings")
      return
    }

    loadBuildingData()
  }, [buildingId])

  const loadBuildingData = async () => {
    if (!buildingId) return

    setLoading(true)
    try {
      const { data: buildingData, error: bError } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", buildingId)
        .single()

      if (bError) throw bError
      setBuilding(buildingData)

      if (buildingData.client_id) {
        const { data: clientData, error: cError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", buildingData.client_id)
          .single()

        if (!cError) setClient(clientData)
      }

      const { data: elevatorsData, error: eError } = await supabase
        .from("elevators")
        .select("*")
        .eq("building_id", buildingId)
        .order("mol_number", { ascending: true })

      if (!eError) setElevators(elevatorsData || [])

      const { data: ticketsData, error: tError } = await supabase
        .from("tickets")
        .select("*")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false })

      if (!tError) setTickets(ticketsData || [])

      // תיקון שליפת דוחות בודק!
      const { data: reportsData, error: rError } = await supabase
        .from("inspector_reports")
        .select("id, elevator_id, report_date, inspector_name, next_inspection_date, file_name, mol_number")
        .eq("building_id", buildingId)
        .order("report_date", { ascending: false })

      if (!rError) setReports(reportsData || [])

      const { data: attachmentsData, error: aError } = await supabase
        .from("attachments")
        .select("*")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false })

      if (!aError) setAttachments(attachmentsData || [])

    } catch (err: any) {
      console.error("Error loading building data:", err)
      toast({
        title: "שגיאה בטעינה",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
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

  const getDaysUntil = (dateString: string | null): number | null => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  const getNextPMDate = (lastPMDate: string | null): Date | null => {
    if (!lastPMDate) return null
    const last = new Date(lastPMDate)
    const next = new Date(last)
    next.setMonth(last.getMonth() + 3)
    return next
  }

  const getNextInspectionDate = (lastInspectionDate: string | null): Date | null => {
    if (!lastInspectionDate) return null
    const last = new Date(lastInspectionDate)
    const next = new Date(last)
    next.setMonth(last.getMonth() + 6)
    return next
  }

  if (!buildingId || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!building) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">בניין לא נמצא</h2>
            <Button onClick={() => router.push("/buildings")}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              חזור לבניינים
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const activeTickets = tickets.filter(t => 
    t.status !== 'done' && t.status !== 'cancelled'
  )

  const urgentTickets = tickets.filter(t => 
    t.severity === 'critical' || t.severity === 'high'
  )
  
  // Filter tickets based on selection
  const filteredTickets = ticketFilter === "all" 
    ? tickets 
    : ticketFilter === "active"
      ? tickets.filter(t => t.status !== 'done' && t.status !== 'cancelled')
      : tickets.filter(t => t.status === 'done' || t.status === 'cancelled')
  
  // Handler functions
  const handleCreateTicket = () => {
    router.push(`/tickets?new=true&building=${buildingId}`)
  }
  
  const handleCreateElevator = () => {
    router.push(`/elevators?new=true&building=${buildingId}`)
  }
  
  const handleUploadFile = () => {
    toast({
      title: "בקרוב",
      description: "העלאת קבצים תהיה זמינה בקרוב"
    })
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/buildings")}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              בניינים
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {building.street} {building.house_number}
                {building.entrance && `, כניסה ${building.entrance}`}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {building.city}
                </span>
                {building.building_type && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{building.building_type}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/buildings?edit=${building.id}`)}>
              <Edit className="h-4 w-4 ml-2" />
              ערוך
            </Button>
            <Button size="sm" onClick={handleCreateTicket}>
              <Plus className="h-4 w-4 ml-2" />
              קריאה חדשה
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">מעליות</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {elevators.length}
                  </p>
                </div>
                <Wrench className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">פעילות</p>
                  <p className="text-xl font-bold text-orange-600">
                    {activeTickets.length}
                  </p>
                </div>
                <AlertCircle className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">דחופות</p>
                  <p className="text-xl font-bold text-red-600">
                    {urgentTickets.length}
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">דוחות</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {reports.length}
                  </p>
                </div>
                <FileText className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">קבצים</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {attachments.length}
                  </p>
                </div>
                <Paperclip className="h-6 w-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex h-[calc(100vh-240px)]">
        {/* RIGHT SIDEBAR - Building Info */}
        <div className="w-[320px] border-l border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Client Info */}
            {client && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                    לקוח
                  </h3>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {client.name}
                    </p>
                    {client.contact_name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {client.contact_name}
                      </p>
                    )}
                    {client.contact_phone && (
                      <a 
                        href={`tel:${client.contact_phone}`}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
                      >
                        <Phone className="h-3 w-3" />
                        <span dir="ltr">{client.contact_phone}</span>
                      </a>
                    )}
                    {client.contact_email && (
                      <a 
                        href={`mailto:${client.contact_email}`}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{client.contact_email}</span>
                      </a>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => router.push(`/client-hub?client=${client.id}`)}
                    >
                      <ExternalLink className="h-3 w-3 ml-2" />
                      מרכז לקוח
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Building Details */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  פרטי בניין
                </h3>
                <div className="space-y-2 text-sm">
                  {building.floors && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">קומות</span>
                      <span className="font-semibold">{building.floors}</span>
                    </div>
                  )}
                  {building.apartments && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">דירות</span>
                      <span className="font-semibold">{building.apartments}</span>
                    </div>
                  )}
                  {building.build_year && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">שנת בנייה</span>
                      <span className="font-semibold">{building.build_year}</span>
                    </div>
                  )}
                  {!building.floors && !building.apartments && !building.build_year && (
                    <p className="text-xs text-gray-500 italic">אין מידע נוסף</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Access & Keys */}
            {(building.access_code || building.key_location || building.parking_available !== null) && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    גישה ומפתחות
                  </h3>
                  <div className="space-y-3">
                    {building.access_code && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">קוד כניסה</p>
                        <p className="text-lg font-mono font-bold text-blue-700 dark:text-blue-400">
                          {building.access_code}
                        </p>
                      </div>
                    )}
                    {building.key_location && (
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">מיקום מפתחות</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {building.key_location}
                        </p>
                      </div>
                    )}
                    {building.parking_available !== null && (
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {building.parking_available ? (
                            <span className="text-green-600 font-medium">חניה זמינה</span>
                          ) : (
                            <span className="text-gray-600">אין חניה</span>
                          )}
                        </span>
                      </div>
                    )}
                    {building.parking_info && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {building.parking_info}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {building.notes && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    הערות
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {building.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  פעולות מהירות
                </h3>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleCreateTicket}>
                    <Plus className="h-4 w-4 ml-2" />
                    קריאה חדשה
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => {
                    if (client?.contact_phone) {
                      window.open(`tel:${client.contact_phone}`, '_self')
                    } else {
                      toast({ title: "אין מספר טלפון ללקוח" })
                    }
                  }}>
                    <MessageSquare className="h-4 w-4 ml-2" />
                    צור קשר
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => {
                    toast({ title: "בקרוב", description: "יצירת דוחות תהיה זמינה בקרוב" })
                  }}>
                    <FileText className="h-4 w-4 ml-2" />
                    הפק דוח
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
          <Tabs defaultValue="elevators" className="h-full" dir="rtl">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 bg-gray-50 dark:bg-slate-900">
              <TabsList className="h-12 bg-transparent gap-1">
                <TabsTrigger value="elevators" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                  <Wrench className="h-4 w-4 ml-2" />
                  מעליות ({elevators.length})
                </TabsTrigger>
                <TabsTrigger value="tickets" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                  <AlertCircle className="h-4 w-4 ml-2" />
                  קריאות ({tickets.length})
                </TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                  <FileText className="h-4 w-4 ml-2" />
                  דוחות ({reports.length})
                </TabsTrigger>
                <TabsTrigger value="files" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                  <Paperclip className="h-4 w-4 ml-2" />
                  קבצים ({attachments.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Elevators Tab */}
            <TabsContent value="elevators" className="p-6">
              {elevators.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Wrench className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">אין מעליות בבניין</h3>
                    <p className="text-gray-600 mb-4">התחל בהוספת מעלית ראשונה</p>
                    <Button onClick={handleCreateElevator}>
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף מעלית
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {elevators.map((elevator, idx) => {
                    const nextPM = getNextPMDate(elevator.last_pm_date)
                    const nextInspection = getNextInspectionDate(elevator.last_inspection_date)
                    const daysUntilInspection = nextInspection ? getDaysUntil(nextInspection.toISOString()) : null
                    const isInspectionUrgent = daysUntilInspection !== null && daysUntilInspection <= 14

                    return (
                      <Card key={elevator.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  <Hash className="h-3 w-3 ml-1" />
                                  {idx + 1}
                                </Badge>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                  מעלית {idx + 1}
                                </h3>
                              </div>
                              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                MOL: {elevator.mol_number}
                              </p>
                            </div>
                            {elevator.manufacturer && (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">
                                {elevator.manufacturer}
                              </Badge>
                            )}
                          </div>

                          {/* Technical Specs */}
                          {(elevator.load_capacity_kg || elevator.speed_mps || elevator.stops_count) && (
                            <>
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                {elevator.load_capacity_kg && (
                                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <Weight className="h-4 w-4 mx-auto mb-1 text-gray-500" />
                                    <p className="text-xs text-gray-600 dark:text-gray-400">משקל</p>
                                    <p className="text-sm font-bold">{elevator.load_capacity_kg} ק"ג</p>
                                  </div>
                                )}
                                {elevator.speed_mps && (
                                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <Gauge className="h-4 w-4 mx-auto mb-1 text-gray-500" />
                                    <p className="text-xs text-gray-600 dark:text-gray-400">מהירות</p>
                                    <p className="text-sm font-bold">{elevator.speed_mps} m/s</p>
                                  </div>
                                )}
                                {elevator.stops_count && (
                                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <Building2 className="h-4 w-4 mx-auto mb-1 text-gray-500" />
                                    <p className="text-xs text-gray-600 dark:text-gray-400">תחנות</p>
                                    <p className="text-sm font-bold">{elevator.stops_count}</p>
                                  </div>
                                )}
                              </div>
                              <Separator className="my-3" />
                            </>
                          )}

                          {/* Additional Info */}
                          <div className="space-y-2 text-xs mb-4">
                            {elevator.drive_type && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">סוג הנעה</span>
                                <span className="font-medium">{DRIVE_TYPE_LABELS[elevator.drive_type] || elevator.drive_type}</span>
                              </div>
                            )}
                            {elevator.door_type && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">סוג דלת</span>
                                <span className="font-medium">{DOOR_TYPE_LABELS[elevator.door_type] || elevator.door_type}</span>
                              </div>
                            )}
                            {elevator.install_year && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">שנת התקנה</span>
                                <span className="font-medium">{elevator.install_year}</span>
                              </div>
                            )}
                          </div>

                          {/* Maintenance Dates */}
                          <div className="space-y-2 mb-4">
                            <div className={`p-2 rounded text-xs ${
                              nextPM && nextPM.getTime() < Date.now() 
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                                : 'bg-gray-50 dark:bg-gray-800'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">טיפול מונע</span>
                                <span className="font-semibold">
                                  {elevator.last_pm_date 
                                    ? new Date(elevator.last_pm_date).toLocaleDateString('he-IL')
                                    : "טרם בוצע"
                                  }
                                </span>
                              </div>
                              {nextPM && (
                                <p className="text-xs mt-1">
                                  הבא: {nextPM.toLocaleDateString('he-IL')}
                                </p>
                              )}
                            </div>

                            <div className={`p-2 rounded text-xs ${
                              isInspectionUrgent
                                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' 
                                : 'bg-gray-50 dark:bg-gray-800'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">בדיקת בודק</span>
                                <span className="font-semibold">
                                  {elevator.last_inspection_date 
                                    ? new Date(elevator.last_inspection_date).toLocaleDateString('he-IL')
                                    : "טרם בוצעה"
                                  }
                                </span>
                              </div>
                              {nextInspection && (
                                <p className="text-xs mt-1 flex items-center gap-1">
                                  {isInspectionUrgent && <AlertTriangle className="h-3 w-3" />}
                                  הבאה: {nextInspection.toLocaleDateString('he-IL')}
                                  {daysUntilInspection && daysUntilInspection > 0 && (
                                    <span className="font-bold">
                                      ({daysUntilInspection} ימים)
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>

                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => router.push(`/elevators?id=${elevator.id}`)}
                          >
                            <ExternalLink className="h-3 w-3 ml-2" />
                            פרטים מלאים
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="p-6">
              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">אין קריאות שירות</h3>
                    <p className="text-gray-600 mb-4">לא נמצאו קריאות לבניין זה</p>
                    <Button onClick={handleCreateTicket}>
                      <Plus className="h-4 w-4 ml-2" />
                      קריאה חדשה
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Filter Buttons */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={ticketFilter === "active" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTicketFilter("active")}
                    >
                      <AlertCircle className="h-4 w-4 ml-2" />
                      פעילות ({activeTickets.length})
                    </Button>
                    <Button
                      variant={ticketFilter === "completed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTicketFilter("completed")}
                    >
                      <CheckCircle className="h-4 w-4 ml-2" />
                      הושלמו ({tickets.filter(t => t.status === 'done' || t.status === 'cancelled').length})
                    </Button>
                    <Button
                      variant={ticketFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTicketFilter("all")}
                    >
                      כל הקריאות ({tickets.length})
                    </Button>
                  </div>

                  {/* Tickets List */}
                  <div className="space-y-3">
                    {filteredTickets.map(ticket => {
                      const statusConfig = STATUS_CONFIG[ticket.status]
                      const severityConfig = SEVERITY_CONFIG[ticket.severity]
                      const isCompleted = ticket.status === 'done' || ticket.status === 'cancelled'
                      
                      return (
                        <Card 
                          key={ticket.id} 
                          className={`hover:shadow-md transition-shadow cursor-pointer ${
                            isCompleted ? 'opacity-60 bg-gray-50 dark:bg-gray-800/50' : ''
                          }`}
                          onClick={() => router.push(`/tickets/${ticket.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className={`font-semibold ${
                                    isCompleted 
                                      ? 'text-gray-600 dark:text-gray-400 line-through' 
                                      : 'text-gray-900 dark:text-gray-100'
                                  }`}>
                                    {ticket.title}
                                  </h3>
                                  {statusConfig && (
                                    <Badge className={`${statusConfig.color} text-white text-xs`}>
                                      {statusConfig.label}
                                    </Badge>
                                  )}
                                </div>
                                {ticket.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                    {ticket.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>נפתח {getRelativeTime(ticket.created_at)}</span>
                                  {severityConfig && (
                                    <>
                                      <Separator orientation="vertical" className="h-3" />
                                      <span className={severityConfig.color + " font-medium"}>
                                        {severityConfig.label}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Reports Tab - מתוקן! */}
            <TabsContent value="reports" className="p-6">
              {reports.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">אין דוחות בודק</h3>
                    <p className="text-gray-600">לא נמצאו דוחות לבניין זה</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {reports.map(report => {
                    const elevator = elevators.find(e => e.id === report.elevator_id)
                    
                    return (
                      <Card key={report.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                                  {new Date(report.report_date).toLocaleDateString('he-IL', { 
                                    day: '2-digit', 
                                    month: 'long', 
                                    year: 'numeric' 
                                  })}
                                </h3>
                                <Badge variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 ml-1" />
                                  דוח בודק
                                </Badge>
                              </div>
                              {elevator ? (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  מעלית: MOL {elevator.mol_number}
                                </p>
                              ) : report.mol_number && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  מעלית: MOL {report.mol_number}
                                </p>
                              )}
                              {report.inspector_name && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  בודק: {report.inspector_name}
                                </p>
                              )}
                              {report.file_name && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                  {report.file_name}
                                </p>
                              )}
                              {report.next_inspection_date && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                  בדיקה הבאה: {new Date(report.next_inspection_date).toLocaleDateString('he-IL')}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <FileText className="h-3 w-3 ml-2" />
                            הצג דוח
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="p-6">
              {attachments.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Paperclip className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">אין קבצים</h3>
                    <p className="text-gray-600 mb-4">לא נמצאו קבצים מצורפים</p>
                    <Button onClick={handleUploadFile}>
                      <Plus className="h-4 w-4 ml-2" />
                      העלה קובץ
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {attachments.map(file => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Paperclip className="h-5 w-5 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                              {file.file_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{formatFileSize(file.file_size)}</span>
                              <Separator orientation="vertical" className="h-3" />
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
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function SiteHubPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    }>
      <SiteHubContent />
    </Suspense>
  )
}