"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ui/use-toast"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Download,
  Eye,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  Phone,
  Search,
  Filter,
  UserPlus,
  Building2,
  List,
  LayoutGrid
} from "lucide-react"
import { logTicketCreated, logTicketAssigned, logEmergencyPulled } from "@/lib/ticketActivities"

type Building = {
  id: string
  address: string
  city: string
  entrance: string | null
}

type Elevator = {
  id: string
  building_id: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
}

type Technician = {
  id: string
  full_name: string
  phone: string
}

type Ticket = {
  id: string
  title: string
  description?: string
  severity: string
  status: string
  priority?: string
  created_at: string
  updated_at: string
  assigned_technician_id?: string
  elevator_id?: string
  ticket_type?: 'service' | 'emergency'
  trapped_person_name?: string
  trapped_person_phone?: string
  building?: {
    id: string
    address: string
    city: string
    client?: {
      id: string
      name: string
    }
  }
  technician?: {
    id: string
    full_name: string
    phone: string
  }
}

const STATUS_CONFIG = {
  new: { label: "חדש", variant: "new" as const, icon: FileText, color: "text-purple-600" },
  assigned: { label: "שוייך", variant: "assigned" as const, icon: User, color: "text-blue-600" },
  in_progress: { label: "בטיפול", variant: "progress" as const, icon: Clock, color: "text-yellow-600" },
  waiting_parts: { label: "ממתין לחלקים", variant: "waiting" as const, icon: AlertTriangle, color: "text-orange-600" },
  done: { label: "הושלם", variant: "done" as const, icon: CheckCircle, color: "text-green-600" },
  cancelled: { label: "בוטל", variant: "cancelled" as const, icon: FileText, color: "text-gray-600" },
}

const SEVERITY_CONFIG = {
  low: { label: "נמוכה", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-800" },
  medium: { label: "בינונית", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  high: { label: "גבוהה", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  critical: { label: "קריטית", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
}

export default function TicketsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // States
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("active") // ברירת מחדל - רק פעילות!
  const [severityFilter, setSeverityFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards") // מצב תצוגה
  const [error, setError] = useState<string | null>(null)

  // Dialog & Form
  const [openDialog, setOpenDialog] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [elevators, setElevators] = useState<Elevator[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loadingForm, setLoadingForm] = useState(false)

  // Quick assign
  const [assigningTicket, setAssigningTicket] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "medium",
    status: "new",
    priority: "medium",
    building_id: "",
    elevator_id: "",
    assigned_technician_id: "",
    reported_by: "",
    reporter_phone: "",
    reporter_type: "tenant",
    ticket_type: "service" as "service" | "emergency",
    trapped_person_name: "",
    trapped_person_phone: ""
  })

  // Load tickets
  const loadTickets = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          building:buildings(id, address, city, client:clients(id, name)),
          technician:technicians!tickets_assigned_technician_fkey(id, full_name, phone)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setTickets(data || [])
      
      // ברירת מחדל - להציג רק קריאות פעילות
      const activeTickets = (data || []).filter(
        t => t.status !== 'done' && t.status !== 'cancelled'
      )
      setFilteredTickets(activeTickets)

    } catch (err: any) {
      console.error("Load tickets error:", err)
      setError(err.message)
      
      toast({
        title: "שגיאה בטעינת קריאות",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // חישוב זמן פתוח
  const getTimeElapsed = (createdAt: string, status: string, updatedAt: string): string => {
    const created = new Date(createdAt)
    
    if (status === 'done' || status === 'cancelled') {
      const closed = new Date(updatedAt)
      const diffMs = closed.getTime() - created.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 60) return `נסגר לאחר ${diffMins} דקות`
      if (diffHours < 24) return `נסגר לאחר ${diffHours} שעות`
      if (diffDays === 1) return "נסגר לאחר יום אחד"
      if (diffDays < 7) return `נסגר לאחר ${diffDays} ימים`
      
      const diffWeeks = Math.floor(diffDays / 7)
      if (diffWeeks === 1) return "נסגר לאחר שבוע"
      return `נסגר לאחר ${diffWeeks} שבועות`
    }
    
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins} דקות`
    if (diffHours < 24) return `${diffHours} שעות`
    if (diffDays === 1) return "יום אחד"
    if (diffDays < 7) return `${diffDays} ימים`
    
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks === 1) return "שבוע"
    return `${diffWeeks} שבועות`
  }

  // Load form data
  const loadFormData = async () => {
    setLoadingForm(true)
    try {
      const [buildingsRes, techsRes] = await Promise.all([
        supabase
          .from("buildings")
          .select("id, address, city, entrance")
          .order("address", { ascending: true }),
        supabase
          .from("technicians")
          .select("id, full_name, phone")
          .eq("status", "active")
          .order("full_name", { ascending: true })
      ])

      if (buildingsRes.error) throw buildingsRes.error
      if (techsRes.error) throw techsRes.error

      setBuildings(buildingsRes.data || [])
      setTechnicians(techsRes.data || [])
    } catch (err: any) {
      console.error("Error loading form data:", err)
      toast({
        title: "שגיאה בטעינת נתונים",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoadingForm(false)
    }
  }

  // Load elevators when building selected
  const loadElevators = async (buildingId: string) => {
    if (!buildingId) {
      setElevators([])
      return
    }

    try {
      const { data, error } = await supabase
        .from("elevators")
        .select("id, building_id, manufacturer, model, serial_number")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setElevators(data || [])
    } catch (err: any) {
      console.error("Error loading elevators:", err)
      setElevators([])
    }
  }

  // Handle building change
  const handleBuildingChange = (buildingId: string) => {
    setFormData({ 
      ...formData, 
      building_id: buildingId,
      elevator_id: ""
    })
    loadElevators(buildingId)
  }

  // Create ticket
  const handleCreateTicket = async () => {
    try {
      if (!formData.title.trim()) {
        toast({
          title: "שגיאה",
          description: "יש להזין כותרת לקריאה",
          variant: "destructive"
        })
        return
      }

      if (!formData.building_id) {
        toast({
          title: "שגיאה",
          description: "יש לבחור בניין",
          variant: "destructive"
        })
        return
      }

      setLoadingForm(true)

      const payload: any = {
        title: formData.title,
        description: formData.description || null,
        severity: formData.severity,
        status: formData.status,
        priority: formData.priority,
        building_id: formData.building_id,
        elevator_id: formData.elevator_id || null,
        assigned_technician_id: formData.assigned_technician_id || null,
        reported_by: formData.reported_by || null,
        reporter_phone: formData.reporter_phone || null,
        reporter_type: formData.reporter_type || null,
        updated_at: new Date().toISOString(),
        ticket_type: formData.ticket_type,
        trapped_person_name: formData.ticket_type === 'emergency' ? formData.trapped_person_name : null,
        trapped_person_phone: formData.ticket_type === 'emergency' ? formData.trapped_person_phone : null,
        emergency_status: formData.ticket_type === 'emergency' ? 'dispatched' : null,
        emergency_timer_started_at: formData.ticket_type === 'emergency' && formData.assigned_technician_id ? new Date().toISOString() : null
      }

      const { data, error } = await supabase
        .from("tickets")
        .insert([payload])
        .select()

      if (error) throw error

      if (data && data[0]) {
        await logTicketCreated(data[0].id, formData.title)
        
        if (formData.assigned_technician_id) {
          const tech = technicians.find(t => t.id === formData.assigned_technician_id)
          if (tech) {
            await logTicketAssigned(data[0].id, tech.full_name)
          }
        }
      }

      toast({
        title: "✅ קריאה נוצרה בהצלחה",
        description: `קריאה #${data[0].id.slice(0, 8)} נוספה למערכת`
      })
      
      setOpenDialog(false)
      setFormData({
        title: "",
        description: "",
        severity: "medium",
        status: "new",
        priority: "medium",
        building_id: "",
        elevator_id: "",
        assigned_technician_id: "",
        reported_by: "",
        reporter_phone: "",
        reporter_type: "tenant",
        ticket_type: "service",
        trapped_person_name: "",
        trapped_person_phone: ""
      })
      setElevators([])
      
      loadTickets()
    } catch (err: any) {
      console.error("Error creating ticket:", err)
      toast({
        title: "שגיאה ביצירת קריאה",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoadingForm(false)
    }
  }

  // Quick assign technician
  const handleQuickAssign = async (ticketId: string, technicianId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    setAssigningTicket(ticketId)
    try {
      const updateData = { 
        assigned_technician_id: technicianId,
        status: "assigned",
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select()

      if (error) throw error

      const tech = technicians.find(t => t.id === technicianId)
      if (tech) {
        await logTicketAssigned(ticketId, tech.full_name)
      }

      toast({
        title: "👨‍🔧 טכנאי שוייך",
        description: `הקריאה שוייכה ל-${tech?.full_name}`
      })

      loadTickets()
    } catch (err: any) {
      toast({
        title: "שגיאה בשיוך טכנאי",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setAssigningTicket(null)
    }
  }

  // Pull ticket
  const handlePullTicket = async (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר למערכת",
        variant: "destructive"
      })
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== 'technician') {
      toast({
        title: "שגיאה",
        description: "רק טכנאים יכולים למשוך קריאות",
        variant: "destructive"
      })
      return
    }

    setAssigningTicket(ticket.id)
    try {
      const isEmergency = ticket.ticket_type === 'emergency'
      
      const updateData: any = { 
        assigned_technician_id: user.id,
        status: "assigned",
        updated_at: new Date().toISOString()
      }

      if (isEmergency) {
        updateData.emergency_status = 'en_route'
        updateData.emergency_timer_started_at = new Date().toISOString()
      }
      
      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticket.id)

      if (error) throw error

      if (isEmergency) {
        await logEmergencyPulled(ticket.id, profile.full_name)
      } else {
        await logTicketAssigned(ticket.id, profile.full_name)
      }

      toast({
        title: isEmergency ? "🚨 קריאת חירום נמשכה!" : "👨‍🔧 קריאה נמשכה",
        description: isEmergency 
          ? "אתה משוייך לקריאת החירום - יוצא לדרך!" 
          : "הקריאה שוייכה אליך"
      })

      loadTickets()
    } catch (err: any) {
      toast({
        title: "שגיאה במשיכת קריאה",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setAssigningTicket(null)
    }
  }

  // Open dialog
  const handleOpenDialog = () => {
    loadFormData()
    setOpenDialog(true)
  }

  // Filter tickets
  useEffect(() => {
    let filtered = tickets

    // סינון לפי סטטוס
    if (statusFilter === "active") {
      // ברירת מחדל - רק קריאות פעילות
      filtered = filtered.filter(ticket => 
        ticket.status !== 'done' && ticket.status !== 'cancelled'
      )
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.status === statusFilter)
    }

    // חיפוש
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.building?.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.building?.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // סינון חומרה
    if (severityFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.severity === severityFilter)
    }

    setFilteredTickets(filtered)
  }, [tickets, searchTerm, statusFilter, severityFilter])

  useEffect(() => {
    loadTickets()
  }, [])

  const getStatusStats = () => {
    const stats = {
      total: tickets.length,
      new: tickets.filter(t => t.status === 'new').length,
      assigned: tickets.filter(t => t.status === 'assigned').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      waiting_parts: tickets.filter(t => t.status === 'waiting_parts').length,
      done: tickets.filter(t => t.status === 'done').length,
      cancelled: tickets.filter(t => t.status === 'cancelled').length,
      critical: tickets.filter(t => t.severity === 'critical' && t.status !== 'done' && t.status !== 'cancelled').length,
      emergency: tickets.filter(t => t.ticket_type === 'emergency' && t.status !== 'done' && t.status !== 'cancelled').length,
      unassigned: tickets.filter(t => !t.assigned_technician_id && t.status !== 'done' && t.status !== 'cancelled').length,
      active: tickets.filter(t => t.status !== 'done' && t.status !== 'cancelled').length
    }
    return stats
  }

  const stats = getStatusStats()

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">טוען קריאות...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                שגיאה בטעינת נתונים
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <Button onClick={loadTickets}>נסה שוב</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">קריאות שירות</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ניהול וטיפול בקריאות שירות • {stats.active} קריאות פעילות
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleOpenDialog} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-md">
              <Plus className="w-5 h-5" />
              קריאה חדשה
            </Button>
            <Button variant="secondary" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              ייצוא
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Emergency Alert Banner */}
        {stats.emergency > 0 && (
          <div className="bg-gradient-to-l from-red-50 to-red-100 border-r-4 border-red-500 rounded-xl p-5 flex items-start gap-4 shadow-lg animate-pulse">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-bold text-red-900">
                  🚨 {stats.emergency} קריאות חירום פעילות
                </h3>
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  דורש טיפול מיידי
                </span>
              </div>
              <p className="text-red-800 text-sm">
                יש אנשים תקועים במעליות • זמן תגובה ממוצע חשוב!
              </p>
            </div>
            <Button 
              onClick={() => {
                setStatusFilter("active")
                setSeverityFilter("all")
                setSearchTerm("")
              }}
              className="bg-red-600 hover:bg-red-700 shadow-md"
            >
              צפה בקריאות →
            </Button>
          </div>
        )}

        {/* Stats Grid - 4 Cards - מוקטנים! */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Critical + Emergency */}
          <Card 
            className="p-3 hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all duration-200 border-r-4 border-red-500" 
            onClick={() => {
              setStatusFilter("all")
              setSeverityFilter("critical")
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <Badge className="bg-red-100 text-red-700 text-xs font-bold">חירום</Badge>
            </div>
            <div className="text-2xl font-bold text-red-600 mb-1">{stats.critical}</div>
            <div className="text-xs text-gray-600 mb-1">קריאות קריטיות</div>
            <div className="text-xs text-red-600 font-semibold">
              {stats.emergency} קריאות חירום
            </div>
          </Card>

          {/* Active Tickets - עם onClick מתוקן! */}
          <Card 
            className="p-3 hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all duration-200 border-r-4 border-yellow-500"
            onClick={() => {
              setStatusFilter("active") // מתוקן!
              setSeverityFilter("all")
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <Badge className="bg-yellow-100 text-yellow-700 text-xs font-bold">פעיל</Badge>
            </div>
            <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.active}</div>
            <div className="text-xs text-gray-600 mb-1">קריאות פעילות</div>
            <div className="text-xs text-gray-600">
              {stats.new} חדשות • {stats.in_progress} בטיפול
            </div>
          </Card>

          {/* Unassigned */}
          <Card 
            className="p-3 hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all duration-200 border-r-4 border-purple-500"
            onClick={() => setStatusFilter("new")}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 text-xs font-bold">ללא שיוך</Badge>
            </div>
            <div className="text-2xl font-bold text-purple-600 mb-1">{stats.unassigned}</div>
            <div className="text-xs text-gray-600 mb-1">ממתינות לשיוך</div>
            <div className="text-xs text-orange-600 font-semibold">דורש טיפול</div>
          </Card>

          {/* Completed */}
          <Card 
            className="p-3 hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all duration-200 border-r-4 border-green-500"
            onClick={() => setStatusFilter("done")}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-700 text-xs font-bold">היום</Badge>
            </div>
            <div className="text-2xl font-bold text-green-600 mb-1">{stats.done}</div>
            <div className="text-xs text-gray-600 mb-1">הושלמו היום</div>
            <div className="text-xs text-green-600 font-semibold">ביצועים מעולים</div>
          </Card>
        </div>

        {/* Search & Filters + View Toggle */}
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חיפוש לפי כותרת, כתובת, לקוח או מספר קריאה..."
                className="pr-11 h-11"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-11">
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">⚡ פעילות ({stats.active})</SelectItem>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="new">🟣 חדשות ({stats.new})</SelectItem>
                <SelectItem value="assigned">🔵 משויכות ({stats.assigned})</SelectItem>
                <SelectItem value="in_progress">🟡 בטיפול ({stats.in_progress})</SelectItem>
                <SelectItem value="waiting_parts">🟠 ממתינות ({stats.waiting_parts})</SelectItem>
                <SelectItem value="done">🟢 הושלמו ({stats.done})</SelectItem>
                <SelectItem value="cancelled">⚫ בוטלו ({stats.cancelled})</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-48 h-11">
                <SelectValue placeholder="כל רמות החומרה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל רמות החומרה</SelectItem>
                <SelectItem value="critical">🔴 קריטית</SelectItem>
                <SelectItem value="high">🟠 גבוהה</SelectItem>
                <SelectItem value="medium">🔵 בינונית</SelectItem>
                <SelectItem value="low">⚪ נמוכה</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="h-9 px-3"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-9 px-3"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="secondary" className="h-11">
              <Filter className="w-4 h-4 ml-2" />
              פילטרים נוספים
            </Button>
          </div>
        </div>

        {/* Tickets Display */}
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || statusFilter !== "active" || severityFilter !== "all" 
                  ? "לא נמצאו קריאות" 
                  : "אין קריאות פעילות"
                }
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || statusFilter !== "active" || severityFilter !== "all"
                  ? "נסה לאפס את המסננים או החיפוש"
                  : "כל הקריאות טופלו - מצוין!"
                }
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleOpenDialog}>
                  <Plus className="w-4 h-4 ml-2" />
                  צור קריאה חדשה
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("active")
                    setSeverityFilter("all")
                    setSearchTerm("")
                  }}
                >
                  אפס מסננים
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          // List View
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-800 border-b">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        סטטוס
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        כותרת
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        כתובת
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        טכנאי
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        זמן
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900 dark:divide-slate-700">
                    {filteredTickets.map((ticket) => {
                      const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]
                      const severityConfig = SEVERITY_CONFIG[ticket.severity as keyof typeof SEVERITY_CONFIG]
                      const isEmergency = ticket.ticket_type === 'emergency'
                      const isCompleted = ticket.status === 'done' || ticket.status === 'cancelled'

                      return (
                        <tr 
                          key={ticket.id}
                          onClick={() => router.push(`/tickets/${ticket.id}`)}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            isCompleted ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <Badge variant={statusConfig?.variant || "new"} className="w-fit">
                                {statusConfig?.label || ticket.status}
                              </Badge>
                              <span className={`text-xs ${severityConfig?.color}`}>
                                {severityConfig?.label}
                              </span>
                              {isEmergency && (
                                <Badge className="bg-red-600 text-white w-fit text-xs">
                                  🚨 חירום
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={isCompleted ? 'line-through text-gray-500' : ''}>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {ticket.title}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                #{ticket.id.slice(0, 8)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {ticket.building?.address}
                              </div>
                              <div className="text-xs text-gray-500">
                                {ticket.building?.city}
                              </div>
                              {ticket.building?.client && (
                                <div className="text-xs text-blue-600 font-medium">
                                  {ticket.building.client.name}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {ticket.technician ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                  {ticket.technician.full_name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{ticket.technician.full_name}</div>
                                  <div className="text-xs text-gray-500">{ticket.technician.phone}</div>
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-orange-600">
                                ללא שיוך
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getTimeElapsed(ticket.created_at, ticket.status, ticket.updated_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/tickets/${ticket.id}`)
                              }}
                            >
                              <Eye className="w-4 h-4 ml-1" />
                              צפה
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Cards View (existing code)
          <div className="space-y-4">
            {filteredTickets.map((ticket, index) => {
              const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]
              const severityConfig = SEVERITY_CONFIG[ticket.severity as keyof typeof SEVERITY_CONFIG]
              const StatusIcon = statusConfig?.icon || FileText
              const isEmergency = ticket.ticket_type === 'emergency'
              const isCompleted = ticket.status === 'done' || ticket.status === 'cancelled'
              const isActiveEmergency = isEmergency && !isCompleted

              return (
                <Card 
                  key={ticket.id} 
                  className={`transition-all duration-200 cursor-pointer hover:shadow-xl ${
                    isCompleted
                      ? 'border-r-4 border-green-500 bg-gradient-to-l from-green-50/30 to-white opacity-75'
                      : isActiveEmergency 
                        ? 'border-r-4 border-red-500 bg-gradient-to-l from-red-50/30 to-white animate-pulse' 
                        : ticket.severity === 'critical'
                          ? 'border-r-4 border-red-400'
                          : ticket.severity === 'high'
                            ? 'border-r-4 border-orange-400'
                            : 'border-r-4 border-gray-200'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                          ? 'bg-green-100 border-2 border-green-500'
                          : isActiveEmergency 
                            ? 'bg-red-100 border-2 border-red-500' 
                            : ticket.severity === 'critical'
                              ? 'bg-red-100'
                              : ticket.severity === 'high'
                                ? 'bg-orange-100'
                                : 'bg-gray-100'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : isActiveEmergency ? (
                          <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
                        ) : (
                          <StatusIcon className={`w-8 h-8 ${statusConfig?.color || 'text-gray-600'}`} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              {isEmergency && (
                                <Badge className="bg-red-600 text-white font-bold">
                                  <AlertTriangle className="w-3 h-3 ml-1" />
                                  🚨 חירום
                                </Badge>
                              )}

                              <Badge variant={statusConfig?.variant || "new"}>
                                <StatusIcon className="w-3 h-3 ml-1" />
                                {statusConfig?.label || ticket.status}
                              </Badge>
                              
                              <span className={`
                                px-3 py-1 rounded-full text-xs font-semibold border
                                ${severityConfig?.bgColor || "bg-gray-100"} 
                                ${severityConfig?.color || "text-gray-600"}
                                border-current border-opacity-20
                              `}>
                                {severityConfig?.label || ticket.severity}
                              </span>

                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                                #{ticket.id.slice(0, 8)}
                              </span>
                            </div>

                            <h3 className={`font-bold text-lg leading-tight mb-1 ${
                              isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'
                            }`}>
                              {ticket.title}
                            </h3>

                            {ticket.description && (
                              <p className={`text-sm mb-3 line-clamp-2 ${
                                isCompleted ? 'text-gray-500' : 'text-gray-600'
                              }`}>
                                {ticket.description}
                              </p>
                            )}
                          </div>

                          {/* Timer */}
                          <div className="text-left">
                            <div className="text-sm text-gray-500">
                              {isCompleted ? 'זמן טיפול' : 'פתוח מזה'}
                            </div>
                            <div className={`text-2xl font-bold ${
                              isCompleted 
                                ? 'text-green-600' 
                                : isActiveEmergency 
                                  ? 'text-red-600' 
                                  : 'text-gray-900'
                            }`}>
                              {getTimeElapsed(ticket.created_at, ticket.status, ticket.updated_at)}
                            </div>
                          </div>
                        </div>

                        {/* Location & Client Info */}
                        <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                          {ticket.building && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <MapPin className="w-4 h-4 flex-shrink-0 text-blue-600" />
                              <span className="truncate font-medium">
                                {ticket.building.address}, {ticket.building.city}
                              </span>
                            </div>
                          )}
                          
                          {ticket.building?.client && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Building2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                              <span className="truncate font-medium">
                                {ticket.building.client.name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Emergency: Trapped Person Info */}
                        {isActiveEmergency && ticket.trapped_person_name && (
                          <div className="bg-gradient-to-l from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-3 mb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-4 h-4 text-orange-600" />
                                  <span className="font-bold text-orange-900 text-sm">
                                    אדם תקוע: {ticket.trapped_person_name}
                                  </span>
                                </div>
                                {ticket.trapped_person_phone && (
                                  <div className="flex items-center gap-2 text-xs text-orange-800">
                                    <Phone className="w-3 h-3" />
                                    <span className="font-mono font-semibold">
                                      {ticket.trapped_person_phone}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-3 h-3 ml-1" />
                                התקשר
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Technician or Actions */}
                        <div className="pt-3 border-t-2 border-gray-200">
                          {ticket.technician ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${
                                  isCompleted 
                                    ? 'bg-gradient-to-br from-green-600 to-green-700'
                                    : 'bg-gradient-to-br from-blue-600 to-blue-700'
                                }`}>
                                  {ticket.technician.full_name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div className={`font-bold ${
                                    isCompleted ? 'text-gray-600' : 'text-gray-900'
                                  }`}>
                                    {ticket.technician.full_name}
                                  </div>
                                  <div className="text-xs text-gray-600 flex items-center gap-2">
                                    <Phone className="w-3 h-3" />
                                    {ticket.technician.phone}
                                  </div>
                                </div>
                              </div>
                              {!isCompleted && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/tickets/${ticket.id}`)
                                  }}
                                >
                                  <Eye className="w-4 h-4 ml-1" />
                                  צפה בקריאה
                                </Button>
                              )}
                            </div>
                          ) : (
                            !isCompleted && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={(e) => handlePullTicket(ticket, e)}
                                  disabled={assigningTicket === ticket.id}
                                  className={`flex-1 h-11 font-bold ${
                                    isActiveEmergency 
                                      ? 'bg-orange-600 hover:bg-orange-700' 
                                      : 'bg-blue-600 hover:bg-blue-700'
                                  }`}
                                >
                                  {assigningTicket === ticket.id ? (
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                  ) : (
                                    <UserPlus className="w-4 h-4 ml-2" />
                                  )}
                                  {isActiveEmergency ? '🔥 משוך חירום!' : 'משוך קריאה'}
                                </Button>

                                <Select 
                                  value="" 
                                  onValueChange={(val) => handleQuickAssign(ticket.id, val, {} as any)}
                                  disabled={assigningTicket === ticket.id}
                                >
                                  <SelectTrigger 
                                    className="w-48 h-11 bg-white"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <SelectValue placeholder="או שייך..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {technicians.map(tech => (
                                      <SelectItem key={tech.id} value={tech.id}>
                                        <div className="flex items-center gap-2">
                                          <User className="w-3 h-3" />
                                          {tech.full_name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Dialog - נשאר ללא שינוי */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent dir="rtl" className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">קריאת שירות חדשה</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">מלא את הפרטים ליצירת קריאה חדשה במערכת</p>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Ticket Type Selection */}
            <div className="space-y-4 pb-6 border-b-4 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">בחר סוג קריאה</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ticket_type: 'service' })}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    formData.ticket_type === 'service' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                      <Phone className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg">קריאת שירות</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">תקלה רגילה - טיפול סטנדרטי</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ticket_type: 'emergency', severity: 'critical', priority: 'urgent' })}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    formData.ticket_type === 'emergency' 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 animate-pulse' 
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="font-bold text-lg text-red-600">🚨 קריאת חירום</h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">אדם תקוע במעלית - דחוף!</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Emergency Warning */}
            {formData.ticket_type === 'emergency' && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                <p className="text-red-800 dark:text-red-200 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>קריאת חירום - יש אדם תקוע במעלית! נדרש טיפול מיידי</span>
                </p>
              </div>
            )}

            {/* Basic Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">פרטים בסיסיים</h3>
              
              <div>
                <Label htmlFor="title">כותרת הקריאה *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="לדוגמה: תקלה במנוע המעלית"
                />
              </div>

              <div>
                <Label htmlFor="description">תיאור מפורט</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תאר את התקלה בפירוט..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity">רמת חומרה</Label>
                  <Select 
                    value={formData.severity} 
                    onValueChange={(val) => setFormData({ ...formData, severity: val })}
                    disabled={formData.ticket_type === 'emergency'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוכה</SelectItem>
                      <SelectItem value="medium">בינונית</SelectItem>
                      <SelectItem value="high">גבוהה</SelectItem>
                      <SelectItem value="critical">קריטית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">עדיפות</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(val) => setFormData({ ...formData, priority: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוכה</SelectItem>
                      <SelectItem value="medium">בינונית</SelectItem>
                      <SelectItem value="high">גבוהה</SelectItem>
                      <SelectItem value="urgent">דחופה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold">מיקום</h3>
              
              <div>
                <Label htmlFor="building">בניין *</Label>
                <Select 
                  value={formData.building_id} 
                  onValueChange={handleBuildingChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר בניין" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(building => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.address}, {building.city}
                        {building.entrance && ` - כניסה ${building.entrance}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {elevators.length > 0 && (
                <div>
                  <Label htmlFor="elevator">מעלית (אופציונלי)</Label>
                  <Select 
                    value={formData.elevator_id} 
                    onValueChange={(val) => setFormData({ ...formData, elevator_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מעלית (אופציונלי)" />
                    </SelectTrigger>
                    <SelectContent>
                      {elevators.map((elevator, idx) => (
                        <SelectItem key={elevator.id} value={elevator.id}>
                          מעלית #{idx + 1}
                          {elevator.manufacturer && ` - ${elevator.manufacturer}`}
                          {elevator.model && ` ${elevator.model}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Emergency Details */}
            {formData.ticket_type === 'emergency' && (
              <div className="space-y-4 pt-6 border-t border-red-300">
                <h3 className="text-lg font-semibold text-red-600">פרטי אדם תקוע</h3>
                
                <div>
                  <Label htmlFor="trapped_person_name">שם מלא של האדם התקוע</Label>
                  <Input
                    id="trapped_person_name"
                    value={formData.trapped_person_name}
                    onChange={(e) => setFormData({ ...formData, trapped_person_name: e.target.value })}
                    placeholder="שם מלא"
                  />
                </div>

                <div>
                  <Label htmlFor="trapped_person_phone">מספר טלפון של האדם התקוע</Label>
                  <Input
                    id="trapped_person_phone"
                    value={formData.trapped_person_phone}
                    onChange={(e) => setFormData({ ...formData, trapped_person_phone: e.target.value })}
                    placeholder="050-1234567"
                  />
                </div>
              </div>
            )}

            {/* Assignment */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold">שיוך טכנאי (אופציונלי)</h3>
              
              <div>
                <Label htmlFor="technician">שייך לטכנאי</Label>
                <Select 
                  value={formData.assigned_technician_id} 
                  onValueChange={(val) => setFormData({ ...formData, assigned_technician_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="השאר לא משוייך (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.full_name} - {tech.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reporter Info */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold">פרטי מדווח (אופציונלי)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reported_by">שם המדווח</Label>
                  <Input
                    id="reported_by"
                    value={formData.reported_by}
                    onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                    placeholder="שם מלא"
                  />
                </div>

                <div>
                  <Label htmlFor="reporter_phone">טלפון מדווח</Label>
                  <Input
                    id="reporter_phone"
                    value={formData.reporter_phone}
                    onChange={(e) => setFormData({ ...formData, reporter_phone: e.target.value })}
                    placeholder="050-1234567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reporter_type">סוג מדווח</Label>
                <Select 
                  value={formData.reporter_type} 
                  onValueChange={(val) => setFormData({ ...formData, reporter_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">דייר</SelectItem>
                    <SelectItem value="property_manager">מנהל נכס</SelectItem>
                    <SelectItem value="committee_member">חבר ועד</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Button 
              onClick={handleCreateTicket}
              disabled={loadingForm}
              className="flex-1 h-12 text-lg bg-blue-600 hover:bg-blue-700"
            >
              {loadingForm ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  יוצר קריאה...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 ml-2" />
                  צור קריאה
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpenDialog(false)}
              disabled={loadingForm}
              className="h-12"
            >
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}