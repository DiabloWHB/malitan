"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  MapPin,
  Building2,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  Loader2,
  Phone,
  Mail,
  Calendar,
  Hash,
  MessageSquare,
  X,
  Navigation,
  Wrench
} from "lucide-react"
import {
  getTicketActivities,
  logStatusChange,
  logTicketAssigned,
  logNoteAdded,
  logEmergencyStatusChange,
  logEmergencyRescueCompleted,
  logEmergencyCancelled,
  getActivityIcon,
  getRelativeTime
} from "@/lib/ticketActivities"

type Ticket = {
  id: string
  title: string
  description: string | null
  severity: string
  status: string
  priority: string | null
  created_at: string
  updated_at: string
  assigned_technician_id: string | null
  building_id: string
  elevator_id: string | null
  reported_by: string | null
  reporter_phone: string | null
  reporter_type: string | null
  ticket_type?: string
  emergency_status?: string | null
  emergency_timer_started_at?: string | null
  emergency_response_time_minutes?: number | null
  trapped_person_name?: string | null
  trapped_person_phone?: string | null
  is_elevator_operational?: boolean | null
  spawned_service_ticket_id?: string | null
  building?: {
    id: string
    address: string
    city: string
    entrance: string | null
    client?: {
      id: string
      name: string
      contact_phone: string | null
      contact_email: string | null
    }
  }
  technician?: {
    id: string
    full_name: string
    phone: string
  }
}

type Activity = {
  id: string
  activity_type: string
  description: string
  created_by_name: string | null
  created_at: string
  metadata: any
}

type Technician = {
  id: string
  full_name: string
  phone: string
}

const STATUS_CONFIG = {
  new: { label: "חדש", color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30" },
  assigned: { label: "שויך", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30" },
  in_progress: { label: "בטיפול", color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30" },
  waiting_parts: { label: "ממתין לחלקים", color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30" },
  done: { label: "הושלם", color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30" },
  cancelled: { label: "בוטל", color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30" }
}

const SEVERITY_CONFIG = {
  low: { label: "נמוכה", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-800" },
  medium: { label: "בינונית", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  high: { label: "גבוהה", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  critical: { label: "קריטית", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" }
}

const EMERGENCY_STATUS_CONFIG = {
  dispatched: { 
    label: "נשלח לטכנאי", 
    icon: "📞", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30" 
  },
  en_route: { 
    label: "טכנאי בדרך", 
    icon: "🚗", 
    color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30" 
  },
  on_site: { 
    label: "טכנאי באתר", 
    icon: "📍", 
    color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30" 
  },
  rescuing: { 
    label: "חילוץ בתהליך", 
    icon: "⚙️", 
    color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30" 
  },
  rescued: { 
    label: "חילוץ הושלם", 
    icon: "✅", 
    color: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30" 
  }
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  
  // Emergency states
  const [elapsedTime, setElapsedTime] = useState("")
  const [showAfterRescueDialog, setShowAfterRescueDialog] = useState(false)
  const [updatingEmergencyStatus, setUpdatingEmergencyStatus] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadTicketData()
      loadTechnicians()
    }
  }, [params.id])

  // Timer for emergency tickets
  useEffect(() => {
    if (ticket?.ticket_type === 'emergency' && ticket.emergency_timer_started_at) {
      const timer = setInterval(() => {
        const now = new Date()
        const started = new Date(ticket.emergency_timer_started_at!)
        const diffMs = now.getTime() - started.getTime()
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
        
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [ticket])

  const loadTicketData = async () => {
    try {
      setLoading(true)
      
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select(`
          *,
          building:buildings(
            id, 
            address, 
            city,
            entrance,
            client:clients(id, name, contact_phone, contact_email)
          ),
          technician:technicians!tickets_assigned_technician_fkey(
            id, 
            full_name, 
            phone
          )
        `)
        .eq("id", params.id)
        .single()

      if (ticketError) throw ticketError
      setTicket(ticketData)

      const { data: activitiesData } = await getTicketActivities(params.id as string)
      setActivities(activitiesData || [])

    } catch (error: any) {
      console.error("Error loading ticket:", error)
      toast({
        title: "שגיאה בטעינת הקריאה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTechnicians = async () => {
    const { data } = await supabase
      .from("technicians")
      .select("id, full_name, phone")
      .eq("status", "active")
      .order("full_name", { ascending: true })
    
    setTechnicians(data || [])
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return
    
    const oldStatus = ticket.status
    if (oldStatus === newStatus) return

    setUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", ticket.id)

      if (error) throw error

      await logStatusChange(ticket.id, oldStatus, newStatus)

      toast({
        title: "✅ הסטטוס עודכן",
        description: `הסטטוס שונה ל-${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label}`
      })

      loadTicketData()
    } catch (error: any) {
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAssignTechnician = async (technicianId: string) => {
    if (!ticket) return

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ 
          assigned_technician_id: technicianId,
          status: ticket.status === "new" ? "assigned" : ticket.status,
          updated_at: new Date().toISOString()
        })
        .eq("id", ticket.id)

      if (error) throw error

      const tech = technicians.find(t => t.id === technicianId)
      if (tech) {
        await logTicketAssigned(ticket.id, tech.full_name)
      }

      toast({
        title: "👨‍🔧 טכנאי שובץ",
        description: `הקריאה שובצה ל-${tech?.full_name}`
      })

      loadTicketData()
    } catch (error: any) {
      toast({
        title: "שגיאה בשיוך טכנאי",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleAddNote = async () => {
    if (!ticket || !newNote.trim()) return

    setAddingNote(true)
    try {
      await logNoteAdded(ticket.id, newNote.trim())

      toast({
        title: "📝 הערה נוספה",
        description: "הערה נוספה בהצלחה להיסטוריית הקריאה"
      })

      setNewNote("")
      loadTicketData()
    } catch (error: any) {
      toast({
        title: "שגיאה בהוספת הערה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setAddingNote(false)
    }
  }

  const handleEmergencyStatusChange = async (newStatus: string) => {
    if (!ticket) return

    setUpdatingEmergencyStatus(true)
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ 
          emergency_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", ticket.id)

      if (error) throw error

      await logEmergencyStatusChange(ticket.id, newStatus, ticket.technician?.full_name)

      toast({
        title: "✅ סטטוס חירום עודכן",
        description: `הסטטוס עודכן ל-${EMERGENCY_STATUS_CONFIG[newStatus as keyof typeof EMERGENCY_STATUS_CONFIG]?.label}`
      })

      loadTicketData()
    } catch (error: any) {
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setUpdatingEmergencyStatus(false)
    }
  }

  const handleCompleteRescue = async (isElevatorOperational: boolean) => {
    if (!ticket) return

    try {
      // חישוב זמן תגובה - מרגע יצירת הקריאה
      const responseTime = Math.floor((new Date().getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60))

      const updateData: any = {
        emergency_status: 'rescued',
        emergency_response_time_minutes: responseTime,
        is_elevator_operational: isElevatorOperational,
        status: 'done',
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticket.id)

      if (error) throw error

      await logEmergencyRescueCompleted(ticket.id, responseTime, isElevatorOperational)

      if (!isElevatorOperational && ticket.elevator_id) {
        const { data: newTicket, error: createError } = await supabase
          .from("tickets")
          .insert([{
            title: `תיקון מעלית לאחר חילוץ - ${ticket.building?.address}`,
            description: `קריאת שירות שנוצרה אוטומטית לאחר חילוץ אדם תקוע.\nקריאת חירום מקורית: #${ticket.id.slice(0, 8)}`,
            severity: 'high',
            status: 'new',
            priority: 'high',
            building_id: ticket.building_id,
            elevator_id: ticket.elevator_id,
            ticket_type: 'service'
          }])
          .select()
          .single()

        if (!createError && newTicket) {
          await supabase
            .from("tickets")
            .update({ spawned_service_ticket_id: newTicket.id })
            .eq("id", ticket.id)

          await logNoteAdded(ticket.id, `נוצרה קריאת שירות חדשה: #${newTicket.id.slice(0, 8)}`)
        }
      }

      toast({
        title: "✅ חילוץ הושלם!",
        description: isElevatorOperational 
          ? `זמן תגובה: ${responseTime} דקות. המעלית תקינה.`
          : `זמן תגובה: ${responseTime} דקות. נפתחה קריאת שירות חדשה.`
      })

      setShowAfterRescueDialog(false)
      loadTicketData()
    } catch (error: any) {
      toast({
        title: "שגיאה בהשלמת חילוץ",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleCancelEmergency = async () => {
    if (!ticket) return

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ 
          status: 'cancelled',
          emergency_status: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", ticket.id)

      if (error) throw error

      await logEmergencyCancelled(ticket.id, "האדם התקוע הצליח לצאת מהמעלית בעצמו")

      toast({
        title: "🚫 קריאה בוטלה",
        description: "קריאת החירום בוטלה בהצלחה"
      })

      loadTicketData()
    } catch (error: any) {
      toast({
        title: "שגיאה בביטול קריאה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const getTimeElapsed = (): string => {
    if (!ticket) return ""
    const now = new Date()
    const created = new Date(ticket.created_at)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins} דקות`
    if (diffHours < 24) return `${diffHours} שעות`
    if (diffDays === 1) return "יום אחד"
    return `${diffDays} ימים`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">טוען קריאה...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">קריאה לא נמצאה</h3>
          <Button onClick={() => router.push("/tickets")}>חזרה לקריאות</Button>
        </div>
      </DashboardLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]
  const severityConfig = SEVERITY_CONFIG[ticket.severity as keyof typeof SEVERITY_CONFIG]
  const isEmergency = ticket.ticket_type === 'emergency'
  const emergencyStatusConfig = ticket.emergency_status 
    ? EMERGENCY_STATUS_CONFIG[ticket.emergency_status as keyof typeof EMERGENCY_STATUS_CONFIG]
    : null

  return (
    <DashboardLayout>
      {/* Header */}
      <div className={`border-b border-gray-200 px-6 py-6 dark:border-slate-700 ${
        isEmergency && ticket.emergency_status !== 'rescued'
          ? 'bg-red-100 dark:bg-red-900/40 animate-pulse' 
          : isEmergency && ticket.emergency_status === 'rescued'
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-white dark:bg-slate-900'
      }`}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/tickets")}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              חזרה
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <div className="flex items-center gap-3 mb-1">
                {isEmergency && (
                  <Badge className={`px-3 py-1 ${
                    ticket.emergency_status === 'rescued'
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white animate-pulse'
                  }`}>
                    {ticket.emergency_status === 'rescued' ? '✅ חירום הושלם' : '🚨 חירום'}
                  </Badge>
                )}
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {ticket.title}
                </h1>
                <Badge className={`${statusConfig?.color} border font-medium px-3 py-1`}>
                  {statusConfig?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-mono flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {ticket.id.slice(0, 8)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  פתוח {getTimeElapsed()}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityConfig?.bgColor} ${severityConfig?.color}`}>
                  {severityConfig?.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Cards Layout */}
        {isEmergency && emergencyStatusConfig && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            
            {/* Status Card - תופס 2 עמודות */}
            <Card className={`lg:col-span-2 border-2 ${
              ticket.emergency_status === 'rescued'
                ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30'
                : 'border-red-400 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 animate-pulse'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl shadow-lg ${
                    ticket.emergency_status === 'rescued' 
                      ? 'bg-white dark:bg-slate-800' 
                      : 'bg-white dark:bg-slate-800 animate-bounce'
                  }`}>
                    {emergencyStatusConfig.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-2xl font-bold ${
                      ticket.emergency_status === 'rescued'
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {emergencyStatusConfig.label}
                    </h3>
                    {elapsedTime && (
                      <div className={`flex items-center gap-2 mt-1 ${
                        ticket.emergency_status === 'rescued'
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-800 dark:text-red-300'
                      }`}>
                        <Clock className="w-5 h-5" />
                        <span className="font-bold text-lg">{elapsedTime}</span>
                        <span className="text-sm">
                          {ticket.emergency_status === 'rescued' ? '(זמן סופי)' : '(זמן מצטבר)'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {ticket.emergency_status === 'en_route' && (
                      <Button
                        onClick={() => handleEmergencyStatusChange('on_site')}
                        disabled={updatingEmergencyStatus}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Navigation className="w-4 h-4 ml-2" />
                        באתר
                      </Button>
                    )}
                    
                    {ticket.emergency_status === 'on_site' && (
                      <Button
                        onClick={() => handleEmergencyStatusChange('rescuing')}
                        disabled={updatingEmergencyStatus}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Wrench className="w-4 h-4 ml-2" />
                        מחלץ
                      </Button>
                    )}
                    
                    {ticket.emergency_status === 'rescuing' && (
                      <Button
                        onClick={() => setShowAfterRescueDialog(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        הושלם
                      </Button>
                    )}

                    {ticket.emergency_status !== 'rescued' && (
                      <Button
                        variant="outline"
                        onClick={handleCancelEmergency}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 ml-2" />
                        ביטול
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trapped Person Card */}
            <Card className="border-2 border-red-300 bg-red-50/50 dark:bg-red-900/20">
              <CardHeader className="pb-3 bg-red-100 dark:bg-red-900/30 border-b border-red-200">
                <CardTitle className="text-base flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="w-5 h-5" />
                  אדם תקוע
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {ticket.trapped_person_name && (
                    <div className="font-bold text-lg">{ticket.trapped_person_name}</div>
                  )}
                  {ticket.trapped_person_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      {ticket.trapped_person_phone}
                    </div>
                  )}
                  {ticket.trapped_person_phone && (
                    <Button 
                      className="w-full mt-2 bg-red-600 hover:bg-red-700 h-11"
                      onClick={() => window.open(`tel:${ticket.trapped_person_phone}`, '_self')}
                    >
                      <Phone className="w-4 h-4 ml-2" />
                      התקשר עכשיו
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Technician Card */}
            <Card className="border-2 border-green-300 bg-green-50/50 dark:bg-green-900/20">
              <CardHeader className="pb-3 bg-green-100 dark:bg-green-900/30 border-b border-green-200">
                <CardTitle className="text-base flex items-center gap-2 text-green-800 dark:text-green-200">
                  <User className="w-5 h-5" />
                  טכנאי מטפל
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {ticket.technician ? (
                  <div className="space-y-2">
                    <div className="font-bold text-lg">{ticket.technician.full_name}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      {ticket.technician.phone}
                    </div>
                    <Button 
                      className="w-full mt-2 bg-green-600 hover:bg-green-700 h-11"
                      onClick={() => window.open(`tel:${ticket.technician!.phone}`, '_self')}
                    >
                      <Phone className="w-4 h-4 ml-2" />
                      התקשר לטכנאי
                    </Button>
                  </div>
                ) : (
                  <Select onValueChange={handleAssignTechnician}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="בחר טכנאי..." />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {tech.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card - תופס 2 עמודות */}
            <Card className="lg:col-span-2 border-2 border-gray-300 dark:border-gray-700">
              <CardHeader className="pb-3 bg-gray-50 dark:bg-gray-800 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  ⚡ פעולות מהירות
                  <Badge variant="outline" className="mr-auto text-xs">מוקדן</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* שורה ראשונה - כפתורי פעולה כלליים */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* שיוך טכנאי */}
                  {!ticket.technician ? (
                    <Select onValueChange={handleAssignTechnician}>
                      <SelectTrigger className="h-11 border-2 border-blue-300">
                        <SelectValue placeholder="👤 שייך טכנאי" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map(tech => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 border-2 border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => window.open(`tel:${ticket.technician!.phone}`, '_self')}
                    >
                      <Phone className="w-4 h-4 ml-2" />
                      חייג לטכנאי
                    </Button>
                  )}
                  
                  {/* התקשר לתקוע / ללקוח */}
                  {ticket.trapped_person_phone ? (
                    <Button
                      variant="outline"
                      className="h-11 border-2 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => window.open(`tel:${ticket.trapped_person_phone}`, '_self')}
                    >
                      <Phone className="w-4 h-4 ml-2" />
                      חייג לתקוע
                    </Button>
                  ) : ticket.building?.client?.contact_phone ? (
                    <Button
                      variant="outline"
                      className="h-11 border-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => window.open(`tel:${ticket.building!.client!.contact_phone}`, '_self')}
                    >
                      <Phone className="w-4 h-4 ml-2" />
                      חייג ללקוח
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 border-2 border-gray-300 text-gray-500"
                      disabled
                    >
                      <Phone className="w-4 h-4 ml-2" />
                      אין טלפון
                    </Button>
                  )}

                  {/* כפתור ניווט */}
                  <Button
                    variant="outline"
                    className="h-11 border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      const address = ticket.building?.address + ", " + ticket.building?.city
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
                    }}
                  >
                    <MapPin className="w-4 h-4 ml-2" />
                    ניווט
                  </Button>

                  {/* כפתור פרטי בניין */}
                  <Button
                    variant="outline"
                    className="h-11 border-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => router.push(`/buildings/${ticket.building_id}`)}
                  >
                    <Building2 className="w-4 h-4 ml-2" />
                    פרטי בניין
                  </Button>
                </div>

                {/* Separator */}
                <Separator />

                {/* שורה שנייה - עדכון סטטוס חירום */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      🔄 עדכן סטטוס חירום
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {emergencyStatusConfig.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {/* כפתור: נשלח לטכנאי */}
                    {ticket.emergency_status !== 'dispatched' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-10 text-xs ${
                          ticket.emergency_status === 'dispatched' 
                            ? 'bg-yellow-100 border-yellow-400 text-yellow-800' 
                            : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                        }`}
                        onClick={() => handleEmergencyStatusChange('dispatched')}
                        disabled={updatingEmergencyStatus || ticket.emergency_status === 'rescued'}
                      >
                        📞 נשלח
                      </Button>
                    )}

                    {/* כפתור: טכנאי בדרך */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-10 text-xs ${
                        ticket.emergency_status === 'en_route' 
                          ? 'bg-blue-100 border-blue-400 text-blue-800' 
                          : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                      }`}
                      onClick={() => handleEmergencyStatusChange('en_route')}
                      disabled={updatingEmergencyStatus || ticket.emergency_status === 'rescued'}
                    >
                      🚗 בדרך
                    </Button>

                    {/* כפתור: באתר */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-10 text-xs ${
                        ticket.emergency_status === 'on_site' 
                          ? 'bg-purple-100 border-purple-400 text-purple-800' 
                          : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                      }`}
                      onClick={() => handleEmergencyStatusChange('on_site')}
                      disabled={updatingEmergencyStatus || ticket.emergency_status === 'rescued'}
                    >
                      📍 באתר
                    </Button>

                    {/* כפתור: מחלץ */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-10 text-xs ${
                        ticket.emergency_status === 'rescuing' 
                          ? 'bg-orange-100 border-orange-400 text-orange-800' 
                          : 'border-orange-300 text-orange-700 hover:bg-orange-50'
                      }`}
                      onClick={() => handleEmergencyStatusChange('rescuing')}
                      disabled={updatingEmergencyStatus || ticket.emergency_status === 'rescued'}
                    >
                      ⚙️ מחלץ
                    </Button>

                    {/* כפתור: חילוץ הושלם */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-10 text-xs ${
                        ticket.emergency_status === 'rescued' 
                          ? 'bg-green-100 border-green-400 text-green-800' 
                          : 'border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                      onClick={() => setShowAfterRescueDialog(true)}
                      disabled={updatingEmergencyStatus || ticket.emergency_status === 'rescued'}
                    >
                      ✅ הושלם
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  תיאור הקריאה
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticket.description ? (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {ticket.description}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">אין תיאור מפורט</p>
                )}
              </CardContent>
            </Card>

            {/* Activity History */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  📋 היסטוריית פעולות
                  <Badge variant="outline" className="font-normal">{activities.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">אין פעולות עדיין</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div 
                        key={activity.id} 
                        className={`flex gap-3 pb-4 ${index < activities.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
                      >
                        <div className="text-2xl flex-shrink-0">{getActivityIcon(activity.activity_type as any)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-gray-100 font-medium">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            <span>{activity.created_by_name || "מערכת"}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{getRelativeTime(activity.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Note */}
            <Card className="shadow-sm border-blue-100 dark:border-blue-900">
              <CardHeader className="pb-3 bg-blue-50 dark:bg-blue-900/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  הוסף הערה או עדכון
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="כתוב הערה, עדכון או תיעוד של הפעולה שבוצעה..."
                    rows={4}
                    className="resize-none text-base"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {newNote.length} תווים
                    </span>
                    <Button 
                      onClick={handleAddNote} 
                      disabled={!newNote.trim() || addingNote}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {addingNote ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          מוסיף...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 ml-2" />
                          הוסף הערה
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Assignment */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">ניהול הקריאה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    סטטוס
                  </label>
                  <Select 
                    value={ticket.status} 
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {!isEmergency && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      טכנאי מטפל
                    </label>
                    {ticket.technician ? (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                          {ticket.technician.full_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {ticket.technician.full_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {ticket.technician.phone}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Select onValueChange={handleAssignTechnician}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="בחר טכנאי..." />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {tech.full_name} • {tech.phone}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  מיקום
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.building && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">כתובת</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {ticket.building.address}, {ticket.building.city}
                        {ticket.building.entrance && ` - כניסה ${ticket.building.entrance}`}
                      </p>
                    </div>
                    {ticket.building.client && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">לקוח</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {ticket.building.client.name}
                          </p>
                          {ticket.building.client.contact_phone && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {ticket.building.client.contact_phone}
                            </p>
                          )}
                          {ticket.building.client.contact_email && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {ticket.building.client.contact_email}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Reporter Info */}
            {(ticket.reported_by || ticket.reporter_phone) && (
              <Card className="shadow-sm border-purple-100 dark:border-purple-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-600" />
                    פרטי מדווח
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ticket.reported_by && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">שם</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {ticket.reported_by}
                      </p>
                    </div>
                  )}
                  {ticket.reporter_phone && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">טלפון</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {ticket.reporter_phone}
                      </p>
                    </div>
                  )}
                  {ticket.reporter_type && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">תפקיד</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {ticket.reporter_type === 'tenant' && '🏠 דייר'}
                        {ticket.reporter_type === 'committee' && '👥 ועד בית'}
                        {ticket.reporter_type === 'manager' && '💼 מנהל'}
                        {ticket.reporter_type === 'other' && '➕ אחר'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  פרטים נוספים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">נוצר ב</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(ticket.created_at).toLocaleString("he-IL", {
                      dateStyle: "long",
                      timeStyle: "short"
                    })}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">עודכן ב</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(ticket.updated_at).toLocaleString("he-IL", {
                      dateStyle: "long",
                      timeStyle: "short"
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog - עדכון לאחר חילוץ */}
      <Dialog open={showAfterRescueDialog} onOpenChange={setShowAfterRescueDialog}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-right flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              עדכון לאחר חילוץ
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <p className="text-center text-lg font-medium mb-4">
                ✅ חילוץ הושלם בהצלחה!
              </p>
              {elapsedTime && (
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                  זמן תגובה: <strong>{elapsedTime}</strong>
                </p>
              )}
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4 text-right">האם המעלית תקינה ופועלת כעת?</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-20 bg-green-600 hover:bg-green-700 text-white font-bold text-lg flex-col gap-2"
                  onClick={() => handleCompleteRescue(true)}
                >
                  <CheckCircle className="w-6 h-6" />
                  כן, תקינה
                  <span className="text-xs opacity-90">סגור את הקריאה</span>
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="h-20 font-bold text-lg flex-col gap-2"
                  onClick={() => handleCompleteRescue(false)}
                >
                  <AlertTriangle className="w-6 h-6" />
                  לא, דרוש תיקון
                  <span className="text-xs opacity-90">פתח קריאת שירות</span>
                </Button>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-right">
                <strong>⚠️ שים לב:</strong> אם המעלית לא תקינה, תיפתח אוטומטית קריאת שירות חדשה לאותה מעלית
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}