"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
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
  Building2,
  AlertCircle,
  MessageSquare,
  Pencil,
  Hash,
  ExternalLink,
  Wrench,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Tag,
  Activity,
  AlertTriangle,
  Plus,
  Package,
  MessageCircle,
  Paperclip,
  Download,
  Eye,
  Shield,
  UserPlus,
  Settings,
  Bell,
  Archive,
  Info
} from "lucide-react"

type Client = {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  contact_name: string | null
  preferred_channel: "whatsapp" | "sms" | "email" | null
  created_at?: string
  contract_number?: string | null
  contract_type?: string | null
  contract_start_date?: string | null
  contract_end_date?: string | null
  monthly_fee?: number | null
  auto_renew?: boolean
  sla_critical_hours?: number
  sla_high_hours?: number
  sla_normal_hours?: number
  tags?: string[]
  internal_notes?: string | null
}

type Building = {
  id: string
  address: string
  city: string
  entrance: string | null
  elevators_count?: number
  floors?: number
  apartments?: number
  build_year?: number
  access_code?: string | null
  parking_available?: boolean
  access_notes?: string | null
}

type Elevator = {
  id: string
  building_id: string
  mol_number: string
  manufacturer: string | null
  last_pm_date: string | null
  last_inspection_date: string | null
}

type Ticket = {
  id: string
  building_id: string
  title: string
  status: string
  severity: string
  created_at: string
  updated_at: string
}

type Contact = {
  id: string
  name: string
  phone?: string
  email?: string
  role: string
  is_primary: boolean
}

type Document = {
  id: string
  name: string
  type: string
  size: number
  uploaded_at: string
  expires_at?: string | null
}

type Communication = {
  id: string
  type: 'email' | 'whatsapp' | 'phone' | 'sms'
  subject: string
  content?: string
  created_at: string
  duration_minutes?: number
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-green-600" },
  sms: { label: "SMS", icon: MessageSquare, color: "text-blue-600" },
  email: { label: "Email", icon: Mail, color: "text-purple-600" }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: "חדש", color: "bg-purple-500", icon: AlertCircle },
  assigned: { label: "שויך", color: "bg-blue-500", icon: User },
  in_progress: { label: "בטיפול", color: "bg-yellow-500", icon: Wrench },
  waiting_parts: { label: "מחכה לחלקים", color: "bg-orange-500", icon: Package },
  done: { label: "הושלם", color: "bg-green-500", icon: CheckCircle },
  cancelled: { label: "בוטל", color: "bg-gray-500", icon: AlertCircle }
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: "נמוכה", color: "text-gray-700", bgColor: "bg-gray-100" },
  medium: { label: "בינונית", color: "text-blue-700", bgColor: "bg-blue-100" },
  high: { label: "גבוהה", color: "text-orange-700", bgColor: "bg-orange-100" },
  critical: { label: "קריטית", color: "text-red-700", bgColor: "bg-red-100" }
}

function ClientHubContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get("client")
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [elevators, setElevators] = useState<Elevator[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [communications, setCommunications] = useState<Communication[]>([])

  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    outstandingBalance: 0,
    paidThisMonth: 0,
    overdueInvoices: 0
  })

  useEffect(() => {
    if (!clientId) {
      toast({
        title: "שגיאה",
        description: "לא נמצא מזהה לקוח",
        variant: "destructive"
      })
      router.push("/clients")
      return
    }

    loadClientData()
  }, [clientId])

  const loadClientData = async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const { data: clientData, error: cError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single()

      if (cError) {
        console.error("Client query error:", cError)
        toast({
          title: "שגיאה בטעינת לקוח",
          description: cError.message || "לא הצלחנו לטעון את פרטי הלקוח",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      if (!clientData) {
        toast({
          title: "לקוח לא נמצא",
          description: "הלקוח המבוקש לא קיים במערכת",
          variant: "destructive"
        })
        router.push("/clients")
        setLoading(false)
        return
      }
      
      const enhancedClient = {
        ...clientData,
        contract_number: "2024-" + Math.floor(Math.random() * 1000),
        contract_type: "שירות מלא",
        contract_start_date: "2024-01-01",
        contract_end_date: "2024-12-31",
        monthly_fee: 2500,
        auto_renew: true,
        sla_critical_hours: 2,
        sla_high_hours: 4,
        sla_normal_hours: 24,
        tags: ["VIP", "תשלום מזומן"],
        internal_notes: "לקוח רגיש למחיר. תמיד לבקש אישור לפני עבודות נוספות."
      }
      setClient(enhancedClient)

      const { data: buildingsData, error: bError } = await supabase
        .from("buildings")
        .select(`
          id,
          address,
          city,
          entrance
        `)
        .eq("client_id", clientId)
        .order("city", { ascending: true })

      if (bError) {
        console.error("Buildings query error:", bError)
        toast({
          title: "שגיאה בטעינת בניינים",
          description: bError.message,
          variant: "destructive"
        })
        setBuildings([])
      } else {
        const buildingIds = (buildingsData || []).map(b => b.id)

        let elevatorCounts: Record<string, number> = {}
        if (buildingIds.length > 0) {
          const { data: elevatorsData, error: eError } = await supabase
            .from("elevators")
            .select("id, building_id, mol_number, manufacturer, last_pm_date, last_inspection_date")
            .in("building_id", buildingIds)
            .order("mol_number", { ascending: true })

          if (eError) {
            console.error("Elevators query error:", eError)
            toast({
              title: "שגיאה בטעינת מעליות",
              description: eError.message,
              variant: "destructive"
            })
            setElevators([])
          } else {
            setElevators(elevatorsData || [])

            elevatorCounts = (elevatorsData || []).reduce((acc, e) => {
              acc[e.building_id] = (acc[e.building_id] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          }
        }

        const buildingsWithCount = (buildingsData || []).map(b => ({
          ...b,
          elevators_count: elevatorCounts[b.id] || 0,
          floors: 8,
          apartments: 24,
          build_year: 1985,
          access_code: "1234#",
          parking_available: true,
          access_notes: "שער חשמלי - צריך לחכות לדייר"
        }))
        setBuildings(buildingsWithCount)
      }

      const buildingIds = buildings.map(b => b.id)
      if (buildingIds.length > 0) {
        const { data: ticketsData, error: tError } = await supabase
          .from("tickets")
          .select("id, building_id, title, status, severity, created_at, updated_at")
          .in("building_id", buildingIds)
          .order("created_at", { ascending: false })

        if (tError) {
          console.error("Tickets query error:", tError)
          toast({
            title: "שגיאה בטעינת קריאות",
            description: tError.message,
            variant: "destructive"
          })
          setTickets([])
        } else {
          setTickets(ticketsData || [])

          const completedTickets = (ticketsData || []).filter(t => t.status === 'done').length
          setFinancialStats({
            totalRevenue: completedTickets * 500,
            outstandingBalance: buildingIds.length * 300,
            paidThisMonth: completedTickets * 200,
            overdueInvoices: Math.floor(buildingIds.length * 0.3)
          })
        }
      }

      setContacts([
        { id: '1', name: clientData.contact_name || 'משה כהן', phone: clientData.contact_phone || '050-1234567', email: clientData.contact_email || '', role: 'יו"ר ועד', is_primary: true },
        { id: '2', name: 'שרה לוי', phone: '052-9876543', role: 'גזבר', is_primary: false },
        { id: '3', name: 'דוד ישראלי', phone: '054-5555555', role: 'טכנאי בית', is_primary: false }
      ])

      setDocuments([
        { id: '1', name: 'חוזה_2024.pdf', type: 'contract', size: 245000, uploaded_at: '2024-01-01', expires_at: '2024-12-31' },
        { id: '2', name: 'אישור_ביטוח.pdf', type: 'insurance', size: 180000, uploaded_at: '2024-01-15', expires_at: '2024-12-31' },
        { id: '3', name: 'תעודת_כושר.pdf', type: 'certificate', size: 320000, uploaded_at: '2024-03-20', expires_at: '2024-09-20' }
      ])

      setCommunications([
        { id: '1', type: 'email', subject: 'חשבונית אוקטובר', created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '2', type: 'whatsapp', subject: 'אישור טיפול מחר', created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '3', type: 'phone', subject: 'תיאום בדיקה', created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), duration_minutes: 5 },
        { id: '4', type: 'email', subject: 'תזכורת תשלום', created_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString() }
      ])

    } catch (err: any) {
      console.error("Unexpected error loading client data:", err)
      toast({
        title: "שגיאה לא צפויה",
        description: "אירעה שגיאה בטעינת הנתונים. אנא נסה שוב.",
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
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`
    if (diffHours < 24) return `לפני ${diffHours} שעות`
    if (diffDays === 0) return "היום"
    if (diffDays === 1) return "אתמול"
    if (diffDays < 7) return `לפני ${diffDays} ימים`
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`
    if (diffDays < 365) return `לפני ${Math.floor(diffDays / 30)} חודשים`
    return `לפני ${Math.floor(diffDays / 365)} שנים`
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

  const calculateHealthScore = (): { score: number; status: string; color: string } => {
    let score = 100
    
    const overdueTickets = tickets.filter(t => 
      t.status !== 'done' && t.status !== 'cancelled' && 
      new Date(t.created_at).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length
    score -= overdueTickets * 10
    
    score -= financialStats.overdueInvoices * 5
    
    const overdueElevators = elevators.filter(e => {
      const nextPM = getNextPMDate(e.last_pm_date)
      return nextPM && nextPM.getTime() < Date.now()
    }).length
    score -= overdueElevators * 8
    
    score = Math.max(0, Math.min(100, score))
    
    if (score >= 80) return { score, status: "מצוין", color: "text-green-600" }
    if (score >= 60) return { score, status: "טוב", color: "text-blue-600" }
    if (score >= 40) return { score, status: "בינוני", color: "text-yellow-600" }
    return { score, status: "דורש תשומת לב", color: "text-red-600" }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (!clientId || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">לקוח לא נמצא</h2>
            <Button onClick={() => router.push("/clients")}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              חזור ללקוחות
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const channelConfig = client.preferred_channel ? CHANNEL_CONFIG[client.preferred_channel] : null
  const activeTickets = tickets.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const recentTickets = tickets.slice(0, 5)
  const healthScore = calculateHealthScore()

  const upcomingEvents: Array<{
    date: Date
    type: string
    title: string
    location?: string
    priority: 'high' | 'medium' | 'low'
  }> = []

  elevators.forEach(e => {
    const nextPM = getNextPMDate(e.last_pm_date)
    if (nextPM && nextPM.getTime() > Date.now()) {
      const building = buildings.find(b => b.id === e.building_id)
      upcomingEvents.push({
        date: nextPM,
        type: 'PM',
        title: `טיפול מונע - ${e.mol_number}`,
        location: building?.address,
        priority: getDaysUntil(nextPM.toISOString()) || 0 < 7 ? 'high' : 'medium'
      })
    }

    const nextInspection = getNextInspectionDate(e.last_inspection_date)
    if (nextInspection && nextInspection.getTime() > Date.now()) {
      const building = buildings.find(b => b.id === e.building_id)
      upcomingEvents.push({
        date: nextInspection,
        type: 'Inspection',
        title: `בדיקת בודק - ${e.mol_number}`,
        location: building?.address,
        priority: getDaysUntil(nextInspection.toISOString()) || 0 < 14 ? 'high' : 'low'
      })
    }
  })

  upcomingEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

  const contractExpiryDays = client.contract_end_date ? getDaysUntil(client.contract_end_date) : null
  const isContractExpiringSoon = contractExpiryDays !== null && contractExpiryDays <= 60

  return (
    <DashboardLayout>
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              לקוחות
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {client.name}
            </h1>
            <Badge variant="outline" className="mr-2">
              לקוח מאז {client.created_at ? new Date(client.created_at).getFullYear() : '—'}
            </Badge>
            {client.tags && client.tags.map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/clients?edit=${client.id}`)}>
              <Pencil className="h-4 w-4 ml-2" />
              ערוך
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 ml-2" />
              פעולה חדשה
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        <div className="w-[320px] border-l border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 overflow-y-auto">
          <div className="p-6 space-y-6">
            {client.contract_number && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    חוזה שירות
                  </h3>
                  <div className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">מס' חוזה</span>
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {client.contract_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">סוג</span>
                      <Badge variant="outline">{client.contract_type}</Badge>
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600 dark:text-gray-400">תוקף</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {client.contract_end_date ? new Date(client.contract_end_date).toLocaleDateString('he-IL') : '—'}
                        </span>
                      </div>
                      {isContractExpiringSoon && (
                        <Badge variant="destructive" className="w-full justify-center text-xs mt-2">
                          <Bell className="h-3 w-3 ml-1" />
                          פוקע בעוד {contractExpiryDays} ימים
                        </Badge>
                      )}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">מחיר חודשי</span>
                      <span className="font-bold text-green-600">
                        ₪{client.monthly_fee?.toLocaleString()}
                      </span>
                    </div>
                    {client.auto_renew && (
                      <Badge variant="secondary" className="w-full justify-center text-xs">
                        <CheckCircle className="h-3 w-3 ml-1" />
                        חידוש אוטומטי
                      </Badge>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                התחייבות שירות (SLA)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded">
                  <span className="text-gray-700 dark:text-gray-300">קריטי</span>
                  <span className="font-bold text-red-600">{client.sla_critical_hours}h</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/10 rounded">
                  <span className="text-gray-700 dark:text-gray-300">גבוה</span>
                  <span className="font-bold text-orange-600">{client.sla_high_hours}h</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/10 rounded">
                  <span className="text-gray-700 dark:text-gray-300">רגיל</span>
                  <span className="font-bold text-blue-600">{client.sla_normal_hours}h</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  אנשי קשר ({contacts.length})
                </h3>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <UserPlus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {contacts.map(contact => (
                  <div key={contact.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {contact.name}
                      </span>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs">ראשי</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{contact.role}</p>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span dir="ltr">{contact.phone}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                מצב לקוח
              </h3>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Health Score</span>
                  <span className={`text-2xl font-bold ${healthScore.color}`}>
                    {healthScore.score}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      healthScore.score >= 80 ? 'bg-green-500' :
                      healthScore.score >= 60 ? 'bg-blue-500' :
                      healthScore.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthScore.score}%` }}
                  />
                </div>
                <p className={`text-xs font-medium ${healthScore.color}`}>{healthScore.status}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                סטטיסטיקות
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">בניינים</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{buildings.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">מעליות</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{elevators.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">קריאות פעילות</span>
                  <span className="font-semibold text-orange-600">{activeTickets.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">הושלמו</span>
                  <span className="font-semibold text-green-600">{tickets.filter(t => t.status === 'done').length}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                מצב פיננסי
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">הכנסות שנה</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    ₪{financialStats.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">חוב פתוח</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">
                    ₪{financialStats.outstandingBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {client.internal_notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  הערות פנימיות
                </h3>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border-r-4 border-yellow-500">
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {client.internal_notes}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                פעולות מהירות
              </h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Plus className="h-4 w-4 ml-2" />
                  קריאה חדשה
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 ml-2" />
                  שלח הודעה
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="h-4 w-4 ml-2" />
                  צור חשבונית
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="h-4 w-4 ml-2" />
                  תזמן פגישה
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
          <Tabs defaultValue="properties" className="h-full" dir="rtl">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 bg-gray-50 dark:bg-slate-900">
              <TabsList className="h-14 bg-transparent gap-1">
                <TabsTrigger 
                  value="properties" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-t-lg border-b-0 px-6 h-12"
                >
                  <Building2 className="h-4 w-4 ml-2" />
                  <span className="font-semibold">בניינים</span>
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {buildings.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="activity"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-t-lg border-b-0 px-6 h-12"
                >
                  <Activity className="h-4 w-4 ml-2" />
                  <span className="font-semibold">פעילות</span>
                  {activeTickets.length > 0 && (
                    <Badge variant="destructive" className="mr-2 text-xs">
                      {activeTickets.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-t-lg border-b-0 px-6 h-12"
                >
                  <Calendar className="h-4 w-4 ml-2" />
                  <span className="font-semibold">לוח זמנים</span>
                  {upcomingEvents.length > 0 && (
                    <Badge variant="outline" className="mr-2 text-xs">
                      {upcomingEvents.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="documents"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-t-lg border-b-0 px-6 h-12"
                >
                  <Paperclip className="h-4 w-4 ml-2" />
                  <span className="font-semibold">מסמכים</span>
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {documents.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="communications"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-t-lg border-b-0 px-6 h-12"
                >
                  <MessageSquare className="h-4 w-4 ml-2" />
                  <span className="font-semibold">התכתבות</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-t-lg border-b-0 px-6 h-12"
                >
                  <DollarSign className="h-4 w-4 ml-2" />
                  <span className="font-semibold">חשבוניות</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="properties" className="p-6">
              {buildings.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">אין בניינים</h3>
                    <p className="text-gray-600 mb-4">לא נמצאו בניינים ללקוח זה</p>
                    <Button>הוסף בניין</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {buildings.map((building) => {
                    const buildingElevators = elevators.filter(e => e.building_id === building.id)
                    const buildingTickets = tickets.filter(t => t.building_id === building.id && t.status !== 'done')
                    
                    return (
                      <Card key={building.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                                {building.address}
                                {building.entrance && `, כניסה ${building.entrance}`}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {building.city}
                              </p>
                            </div>
                            {buildingTickets.length > 0 && (
                              <Badge variant="destructive">
                                {buildingTickets.length} פעילות
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <Wrench className="h-3 w-3 text-gray-400" />
                                <span>{buildingElevators.length} מעליות</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-gray-400" />
                                <span>{building.floors} קומות</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-400" />
                                <span>{building.apartments} דירות</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span>בנוי {building.build_year}</span>
                              </div>
                            </div>
                            
                            {building.access_notes && (
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/10 rounded text-xs">
                                <p className="text-blue-800 dark:text-blue-300">
                                  <Info className="h-3 w-3 inline ml-1" />
                                  {building.access_notes}
                                </p>
                              </div>
                            )}
                          </div>

                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => router.push(`/site-hub?building=${building.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 ml-2" />
                            Site Hub
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    קריאות שירות אחרונות
                  </h2>
                  <Button size="sm" onClick={() => router.push('/tickets')}>
                    <Plus className="h-4 w-4 ml-2" />
                    קריאה חדשה
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {recentTickets.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">אין קריאות שירות</p>
                      </CardContent>
                    </Card>
                  ) : (
                    recentTickets.map(ticket => {
                      const statusConfig = STATUS_CONFIG[ticket.status]
                      const building = buildings.find(b => b.id === ticket.building_id)
                      return (
                        <Card 
                          key={ticket.id}
                          className="hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer"
                          onClick={() => router.push(`/tickets?id=${ticket.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${statusConfig.color} text-white shrink-0`}>
                                <statusConfig.icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {ticket.title}
                                  </h3>
                                  <Badge className={`${statusConfig.color} text-white shrink-0`}>
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                {building && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    <MapPin className="h-3 w-3 inline ml-1" />
                                    {building.address}, {building.city}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>{getRelativeTime(ticket.created_at)}</span>
                                  <Separator orientation="vertical" className="h-3" />
                                  <span>עודכן {getRelativeTime(ticket.updated_at)}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="p-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  אירועים ומשימות קרובות
                </h2>
                
                {upcomingEvents.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold mb-2">אין אירועים קרובים</h3>
                      <p className="text-gray-600">כל הטיפולים והבדיקות מעודכנים</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event, idx) => {
                      const daysUntil = getDaysUntil(event.date.toISOString()) || 0
                      return (
                        <Card key={idx} className={`transition-all hover:shadow-md ${
                          event.priority === 'high' ? 'border-r-4 border-r-red-500' :
                          event.priority === 'medium' ? 'border-r-4 border-r-orange-500' :
                          'border-r-4 border-r-blue-500'
                        }`}>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`p-2 rounded-lg ${
                                    event.type === 'PM' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {event.type === 'PM' ? <Wrench className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {event.type === 'PM' ? 'טיפול מונע' : 'בדיקת בודק'}
                                  </Badge>
                                  {daysUntil <= 7 && (
                                    <Badge variant="destructive" className="text-xs animate-pulse">
                                      דחוף!
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                                  {event.title}
                                </h3>
                                {event.location && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </p>
                                )}
                              </div>
                              <div className="text-left">
                                <div className={`text-center p-3 rounded-lg ${
                                  daysUntil <= 3 ? 'bg-red-100 dark:bg-red-900/20' :
                                  daysUntil <= 7 ? 'bg-orange-100 dark:bg-orange-900/20' :
                                  'bg-blue-100 dark:bg-blue-900/20'
                                }`}>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    {event.date.toLocaleDateString('he-IL', { weekday: 'short' })}
                                  </p>
                                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {event.date.getDate()}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {event.date.toLocaleDateString('he-IL', { month: 'short' })}
                                  </p>
                                </div>
                                <p className={`text-xs text-center mt-2 font-semibold ${
                                  daysUntil <= 3 ? 'text-red-600' :
                                  daysUntil <= 7 ? 'text-orange-600' :
                                  'text-blue-600'
                                }`}>
                                  בעוד {daysUntil} ימים
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    מסמכים וקבצים
                  </h2>
                  <Button size="sm">
                    <Plus className="h-4 w-4 ml-2" />
                    העלה קובץ
                  </Button>
                </div>
                
                {documents.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Paperclip className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold mb-2">אין מסמכים</h3>
                      <p className="text-gray-600 mb-4">לא נמצאו קבצים מצורפים ללקוח זה</p>
                      <Button>
                        <Plus className="h-4 w-4 ml-2" />
                        העלה קובץ ראשון
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {documents.map(doc => {
                      const expiryDays = doc.expires_at ? getDaysUntil(doc.expires_at) : null
                      const isExpiringSoon = expiryDays !== null && expiryDays <= 30
                      
                      return (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg shrink-0">
                                <FileText className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
                                  {doc.name}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                  <span>{formatFileSize(doc.size)}</span>
                                  <Separator orientation="vertical" className="h-3" />
                                  <span>{getRelativeTime(doc.uploaded_at)}</span>
                                </div>
                                {doc.expires_at && (
                                  <div className={`text-xs ${
                                    isExpiringSoon ? 'text-red-600 font-semibold' : 'text-gray-600'
                                  }`}>
                                    <Calendar className="h-3 w-3 inline ml-1" />
                                    תוקף: {new Date(doc.expires_at).toLocaleDateString('he-IL')}
                                    {isExpiringSoon && ` (${expiryDays} ימים)`}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Download className="h-4 w-4" />
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
            </TabsContent>

            <TabsContent value="communications" className="p-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  היסטוריית התכתבות
                </h2>
                
                {communications.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold mb-2">אין התכתבויות</h3>
                      <p className="text-gray-600">לא נמצאו תקשורות עם לקוח זה</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {communications.map(comm => {
                      const typeConfig = {
                        email: { icon: Mail, label: 'Email', color: 'bg-purple-100 text-purple-700' },
                        whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'bg-green-100 text-green-700' },
                        phone: { icon: Phone, label: 'שיחה', color: 'bg-blue-100 text-blue-700' },
                        sms: { icon: MessageSquare, label: 'SMS', color: 'bg-orange-100 text-orange-700' }
                      }[comm.type]
                      
                      return (
                        <Card key={comm.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${typeConfig.color} shrink-0`}>
                                <typeConfig.icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {comm.subject}
                                  </h3>
                                  <Badge variant="outline" className="text-xs">
                                    {typeConfig.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{getRelativeTime(comm.created_at)}</span>
                                  {comm.duration_minutes && (
                                    <>
                                      <Separator orientation="vertical" className="h-3" />
                                      <span>{comm.duration_minutes} דקות</span>
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
                )}
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="p-6">
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">חשבוניות ותשלומים</h3>
                  <p className="text-gray-600 mb-4">
                    פיצ'ר זה יופעל לאחר יצירת טבלאות <code className="bg-gray-100 px-2 py-1 rounded">invoices</code> ו-<code className="bg-gray-100 px-2 py-1 rounded">payments</code>
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ClientHubPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    }>
      <ClientHubContent />
    </Suspense>
  )
}