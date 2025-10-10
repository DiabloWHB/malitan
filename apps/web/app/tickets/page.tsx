"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ui/use-toast"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Loader2,
  X
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import PartsIntegration from "@/components/PartsIntegration"

type Ticket = {
  id: string
  title: string
  description?: string
  severity: string
  status: string
  priority?: string
  created_at: string
  updated_at: string
  assigned_to?: string
  elevator_id?: string
  building?: {
    id: string
    address: string
    city: string
    client?: {
      id: string
      name: string
    }
  }
}

const STATUS_CONFIG = {
  new: { label: "חדש", variant: "new" as const, icon: FileText, color: "text-purple-600" },
  assigned: { label: "שויך", variant: "assigned" as const, icon: User, color: "text-blue-600" },
  in_progress: { label: "בטיפול", variant: "progress" as const, icon: Clock, color: "text-yellow-600" },
  waiting_parts: { label: "מחכה לחלקים", variant: "waiting" as const, icon: AlertTriangle, color: "text-orange-600" },
  done: { label: "הושלם", variant: "done" as const, icon: CheckCircle, color: "text-green-600" },
  cancelled: { label: "בוטל", variant: "cancelled" as const, icon: Trash2, color: "text-gray-600" },
}

const SEVERITY_CONFIG = {
  low: { label: "נמוכה", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-800" },
  medium: { label: "בינונית", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  high: { label: "גבוהה", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  critical: { label: "קריטית", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
}

export default function TicketsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [error, setError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadTickets = async () => {
    console.log("🔄 Starting to load tickets...")
    setLoading(true)
    setError(null)
    
    try {
      // בדיקה בסיסית של החיבור
      console.log("📡 Testing Supabase connection...")
      const { data: testData, error: testError } = await supabase
        .from("tickets")
        .select("count", { count: "exact", head: true })

      if (testError) {
        console.error("❌ Supabase connection error:", testError)
        throw testError
      }

      console.log("✅ Supabase connection successful, count:", testData)

      // טעינת הנתונים המלאים
      console.log("📥 Loading full ticket data...")
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          building:buildings(id, address, city, client:clients(id, name))
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Error loading tickets:", error)
        throw error
      }

      console.log("✅ Tickets loaded successfully:", data?.length || 0, "tickets")
      console.log("📊 Sample data:", data?.[0])

      setTickets(data || [])
      setFilteredTickets(data || [])

    } catch (err: any) {
      console.error("💥 Load tickets error:", err)
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

  // Filter tickets
  useEffect(() => {
    let filtered = tickets

    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.building?.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.building?.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.status === statusFilter)
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.severity === severityFilter)
    }

    setFilteredTickets(filtered)
    console.log("🔍 Filtered tickets:", filtered.length, "out of", tickets.length)
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
      critical: tickets.filter(t => t.severity === 'critical' && t.status !== 'done' && t.status !== 'cancelled').length
    }
    return stats
  }

  // פונקציה לפתיחת Dialog
  const handleTicketClick = (ticket: Ticket) => {
    console.log("🎯 Opening ticket:", ticket.id)
    setSelectedTicket(ticket)
    setDialogOpen(true)
  }

  // פונקציה לשינוי סטטוס
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      console.log("📝 Updating status:", ticketId, "to", newStatus)

      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId)

      if (error) throw error

      // עדכון ה-state המקומי
      setTickets(tickets.map(t =>
        t.id === ticketId ? { ...t, status: newStatus } : t
      ))

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus })
      }

      toast({
        title: "הסטטוס עודכן בהצלחה",
        description: `הקריאה עודכנה ל-${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus}`
      })
    } catch (err: any) {
      console.error("❌ Error updating status:", err)
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: err.message,
        variant: "destructive"
      })
    }
  }

  const stats = getStatusStats()

  // יצירת קריאה לדוגמא (למטרות testing)
  const createSampleTicket = async () => {
    try {
      const sampleTicket = {
        title: "מעלית תקועה - בדיקה",
        description: "קריאה לדוגמא לבדיקת המערכת",
        severity: "high",
        status: "new",
        priority: "high"
      }

      const { data, error } = await supabase
        .from("tickets")
        .insert([sampleTicket])
        .select()

      if (error) throw error

      console.log("✅ Sample ticket created:", data)
      toast({
        title: "קריאה נוצרה בהצלחה",
        description: "קריאת דוגמא נוצרה לבדיקה"
      })
      
      // רענון הנתונים
      loadTickets()
    } catch (err: any) {
      console.error("❌ Error creating sample ticket:", err)
      toast({
        title: "שגיאה ביצירת קריאה",
        description: err.message,
        variant: "destructive"
      })
    }
  }

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
              <p className="text-red-700 dark:text-red-300 mb-4">
                {error}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={loadTickets}>
                  נסה שוב
                </Button>
                <Button variant="secondary" onClick={createSampleTicket}>
                  צור קריאת דוגמא
                </Button>
              </div>
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
              ניהול וטיפול בקריאות שירות • {stats.total} קריאות סה"כ
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={createSampleTicket} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              קריאה חדשה
            </Button>
            <Button variant="secondary" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              ייצוא נתונים
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Debug Info */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              🔍 Debug: {tickets.length} קריאות נטענו, {filteredTickets.length} מוצגות לאחר סינון
            </p>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Card 
            className="p-4 text-center hover-lift cursor-pointer transition-all duration-200" 
            onClick={() => {
              setStatusFilter("all")
              setSeverityFilter("all")
            }}
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">סה"כ</div>
          </Card>

          <Card className="p-4 text-center hover-lift cursor-pointer transition-all duration-200" onClick={() => setStatusFilter("new")}>
            <div className="text-2xl font-bold text-purple-600">{stats.new}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">חדשות</div>
          </Card>

          <Card className="p-4 text-center hover-lift cursor-pointer transition-all duration-200" onClick={() => setStatusFilter("assigned")}>
            <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">משויכות</div>
          </Card>

          <Card className="p-4 text-center hover-lift cursor-pointer transition-all duration-200" onClick={() => setStatusFilter("in_progress")}>
            <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">בטיפול</div>
          </Card>

          <Card className="p-4 text-center hover-lift cursor-pointer transition-all duration-200" onClick={() => setStatusFilter("waiting_parts")}>
            <div className="text-2xl font-bold text-orange-600">{stats.waiting_parts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">מחכות</div>
          </Card>

          <Card className="p-4 text-center hover-lift cursor-pointer transition-all duration-200" onClick={() => setStatusFilter("done")}>
            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">הושלמו</div>
          </Card>

          <Card 
            className="p-4 text-center hover-lift cursor-pointer border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 transition-all duration-200" 
            onClick={() => {
              setSeverityFilter("critical")
              setStatusFilter("all")
            }}
          >
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-red-600 dark:text-red-400">קריטיות</div>
          </Card>
        </div>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || statusFilter !== "all" || severityFilter !== "all" 
                  ? "לא נמצאו קריאות" 
                  : "אין קריאות עדיין"
                }
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || statusFilter !== "all" || severityFilter !== "all"
                  ? "נסה להתאים את המסננים או החיפוש"
                  : "התחל ביצירת קריאת שירות ראשונה"
                }
              </p>
              <Button onClick={createSampleTicket}>
                <Plus className="w-4 h-4 ml-2" />
                צור קריאה ראשונה
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket, index) => {
              const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]
              const severityConfig = SEVERITY_CONFIG[ticket.severity as keyof typeof SEVERITY_CONFIG]
              const StatusIcon = statusConfig?.icon || FileText

              return (
                <Card 
                  key={ticket.id} 
                  hover 
                  className="animate-in transition-all duration-200 cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleTicketClick(ticket)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center flex-wrap gap-3 mb-3">
                          <Badge variant={statusConfig?.variant || "new"}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {statusConfig?.label || ticket.status}
                          </Badge>
                          
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-medium border
                            ${severityConfig?.bgColor || "bg-gray-100 dark:bg-gray-800"} 
                            ${severityConfig?.color || "text-gray-600"}
                            border-current border-opacity-20
                          `}>
                            {severityConfig?.label || ticket.severity}
                          </span>

                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                            #{ticket.id.slice(0, 8)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-lg leading-tight">
                          {ticket.title}
                        </h3>

                        {/* Description */}
                        {ticket.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                            {ticket.description}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {ticket.building && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{ticket.building.address}, {ticket.building.city}</span>
                            </span>
                          )}
                          
                          {ticket.building?.client && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{ticket.building.client.name}</span>
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            נוצר {new Date(ticket.created_at).toLocaleDateString('he-IL')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTicketClick(ticket)
                          }}
                        >
                          <Eye className="w-4 h-4 ml-1" />
                          צפה
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4 ml-1" />
                          ערוך
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialog לפרטי הקריאה */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      {selectedTicket.title}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 text-base text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4" />
                      {selectedTicket.building?.address}, {selectedTicket.building?.city}
                    </DialogDescription>
                  </div>

                  {/* Status Badge */}
                  <Badge variant={STATUS_CONFIG[selectedTicket.status as keyof typeof STATUS_CONFIG]?.variant || "new"}>
                    {STATUS_CONFIG[selectedTicket.status as keyof typeof STATUS_CONFIG]?.label || selectedTicket.status}
                  </Badge>
                </div>
              </DialogHeader>

              <Separator className="my-4" />

              {/* Details Grid */}
              <div className="space-y-6">
                {/* Priority & Status Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                      חומרה
                    </label>
                    <span className={`
                      inline-flex px-3 py-1.5 rounded-lg text-sm font-medium border
                      ${SEVERITY_CONFIG[selectedTicket.severity as keyof typeof SEVERITY_CONFIG]?.bgColor || "bg-gray-100 dark:bg-gray-800"}
                      ${SEVERITY_CONFIG[selectedTicket.severity as keyof typeof SEVERITY_CONFIG]?.color || "text-gray-600"}
                      border-current border-opacity-20
                    `}>
                      {SEVERITY_CONFIG[selectedTicket.severity as keyof typeof SEVERITY_CONFIG]?.label || selectedTicket.severity}
                    </span>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                      שינוי סטטוס
                    </label>
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                    >
                      <SelectTrigger className="w-full">
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
                </div>

                {/* Description */}
                {selectedTicket.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      תיאור התקלה
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Building & Client Info */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedTicket.building?.client && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        לקוח
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedTicket.building.client.name}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      תאריך פתיחה
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {new Date(selectedTicket.created_at).toLocaleString('he-IL')}
                    </p>
                  </div>
                </div>

                {/* ID */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    מזהה קריאה
                  </label>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded font-mono text-gray-700 dark:text-gray-300">
                    {selectedTicket.id}
                  </code>
                </div>

                <Separator className="my-6" />

                {/* Parts Integration */}
                <PartsIntegration
                  ticketId={selectedTicket.id}
                  elevatorId={selectedTicket.elevator_id}
                  onPartsChanged={() => loadTickets()}
                />

                <Separator className="my-6" />

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setDialogOpen(false)}
                  >
                    סגור
                  </Button>
                  <Button variant="secondary">
                    <Edit className="w-4 h-4 ml-2" />
                    ערוך
                  </Button>
                  <Button>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף קובץ
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  )
}