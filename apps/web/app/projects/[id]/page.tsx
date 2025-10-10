"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  ArrowRight,
  Calendar,
  DollarSign,
  User,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Target,
  TrendingUp,
  Package,
  Activity,
  X,
  ShoppingCart,
  FileCheck,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Sparkles
} from "lucide-react"

// Types
type Project = {
  id: string
  project_number: string
  name: string
  description: string | null
  project_type: string
  status: string
  priority: string
  estimated_start_date: string | null
  estimated_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  estimated_budget: number | null
  approved_budget: number | null
  actual_cost: number
  quoted_price: number | null
  progress_percentage: number
  client_id: string
  building_id: string
  lead_technician_id: string | null
  notes: string | null
  created_at: string
}

type Milestone = {
  id: string
  name: string
  description: string | null
  due_date: string
  completed_date: string | null
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled'
  order_index: number
  is_critical: boolean
  assigned_to: string | null
  created_at: string
  source?: 'auto' | 'manual'
  source_details?: string
}

type TimelineEvent = {
  id: string
  date: string
  title: string
  description: string
  type: 'milestone' | 'status_change' | 'budget_update' | 'note' | 'system'
  icon: any
  color: string
  metadata?: any
}

type PurchaseOrder = {
  id: string
  po_number: string
  supplier: string
  status: string
  total_amount: number
  order_date: string
}

type Client = {
  id: string
  name: string
  contact_phone: string | null
}

type Building = {
  id: string
  address: string
  city: string
}

type Technician = {
  id: string
  full_name: string
}

// Config Objects
const PROJECT_TYPES = {
  modernization: { label: 'שדרוג ומודרניזציה', icon: '🔄' },
  new_installation: { label: 'התקנה חדשה', icon: '🆕' },
  component_replacement: { label: 'החלפת רכיבים', icon: '🔧' },
  renovation: { label: 'שיפוץ', icon: '🎨' },
  major_repair: { label: 'תיקון גדול', icon: '⚠️' },
  other: { label: 'אחר', icon: '📋' }
}

const STATUS_CONFIG = {
  planning: { label: 'תכנון', color: 'bg-gray-100 text-gray-800', icon: Clock },
  quotation: { label: 'הצעת מחיר', color: 'bg-yellow-100 text-yellow-800', icon: DollarSign },
  approved: { label: 'אושר', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  in_progress: { label: 'בביצוע', color: 'bg-green-100 text-green-800', icon: PlayCircle },
  on_hold: { label: 'מושהה', color: 'bg-orange-100 text-orange-800', icon: PauseCircle },
  completed: { label: 'הושלם', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-800', icon: XCircle }
}

const MILESTONE_STATUS = {
  not_started: { label: 'לא התחיל', color: 'bg-gray-100 text-gray-800', icon: Clock },
  in_progress: { label: 'בתהליך', color: 'bg-blue-100 text-blue-800', icon: PlayCircle },
  completed: { label: 'הושלם', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-800', icon: XCircle }
}

const MILESTONE_SOURCES = [
  { value: 'quotation_approved', label: 'אישור הצעת מחיר', icon: FileCheck, color: 'text-blue-600' },
  { value: 'work_started', label: 'התחלת עבודה', icon: PlayCircle, color: 'text-green-600' },
  { value: 'inspection_done', label: 'בדיקה הושלמה', icon: CheckCircle2, color: 'text-purple-600' },
  { value: 'delivery', label: 'מסירה ללקוח', icon: Package, color: 'text-orange-600' },
  { value: 'manual', label: 'עדכון ידני', icon: Edit, color: 'text-gray-600' }
]

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [building, setBuilding] = useState<Building | null>(null)
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [milestoneFormData, setMilestoneFormData] = useState({
    name: "",
    description: "",
    due_date: "",
    is_critical: false,
    source: "manual"
  })

  useEffect(() => {
    if (params.id) {
      fetchProjectData()
    }
  }, [params.id])

  const fetchProjectData = async () => {
    try {
      setLoading(true)

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      await Promise.all([
        fetchClient(projectData.client_id),
        fetchBuilding(projectData.building_id),
        fetchTechnician(projectData.lead_technician_id),
        fetchMilestones(),
        fetchPurchaseOrders(),
        buildTimeline(projectData)
      ])

    } catch (error: any) {
      console.error('Error fetching project:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchClient = async (clientId: string) => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, contact_phone')
      .eq('id', clientId)
      .single()
    if (data) setClient(data)
  }

  const fetchBuilding = async (buildingId: string) => {
    const { data } = await supabase
      .from('buildings')
      .select('id, address, city')
      .eq('id', buildingId)
      .single()
    if (data) setBuilding(data)
  }

  const fetchTechnician = async (technicianId: string | null) => {
    if (!technicianId) return
    const { data } = await supabase
      .from('technicians')
      .select('id, full_name')
      .eq('id', technicianId)
      .single()
    if (data) setTechnician(data)
  }

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', params.id)
      .order('order_index', { ascending: true })
    if (data) setMilestones(data)
  }

  const fetchPurchaseOrders = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, po_number, supplier, status, total_amount, order_date')
      .eq('project_id', params.id)
      .order('order_date', { ascending: false })
    if (data) setPurchaseOrders(data)
  }

  const buildTimeline = async (projectData: Project) => {
    const events: TimelineEvent[] = []

    // פרויקט נוצר
    events.push({
      id: 'created',
      date: projectData.created_at,
      title: 'הפרויקט נוצר',
      description: `פרויקט ${projectData.name} נוצר במערכת`,
      type: 'system',
      icon: Sparkles,
      color: 'bg-purple-100 text-purple-600'
    })

    // אבני דרך שהושלמו
    const { data: completedMilestones } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', params.id)
      .eq('status', 'completed')
      .order('completed_date', { ascending: false })

    completedMilestones?.forEach(ms => {
      events.push({
        id: ms.id,
        date: ms.completed_date!,
        title: ms.name,
        description: ms.description || '',
        type: 'milestone',
        icon: CheckCircle2,
        color: 'bg-green-100 text-green-600',
        metadata: ms
      })
    })

    // מיון לפי תאריך
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setTimeline(events)
  }

  const handleCreateMilestone = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("User not found")

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.user.id)
        .single()

      const maxOrder = milestones.length > 0 
        ? Math.max(...milestones.map(m => m.order_index)) 
        : 0

      const newMilestone = {
        project_id: params.id,
        name: milestoneFormData.name,
        description: milestoneFormData.description || null,
        due_date: milestoneFormData.due_date,
        is_critical: milestoneFormData.is_critical,
        status: 'not_started',
        order_index: maxOrder + 1,
        source: 'manual',
        source_details: 'עדכון ידני על ידי מנהל'
      }

      const { error } = await supabase
        .from('project_milestones')
        .insert(newMilestone)

      if (error) throw error

      toast({
        title: "אבן דרך נוספה",
        description: "אבן הדרך נוספה בהצלחה"
      })

      fetchMilestones()
      buildTimeline(project!)
      setMilestoneDialogOpen(false)
      resetMilestoneForm()
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleUpdateMilestoneStatus = async (milestoneId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus }
      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString()
      }

      const { error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', milestoneId)

      if (error) throw error

      toast({
        title: "עודכן",
        description: "סטטוס אבן הדרך עודכן"
      })

      fetchMilestones()
      buildTimeline(project!)
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const resetMilestoneForm = () => {
    setMilestoneFormData({
      name: "",
      description: "",
      due_date: "",
      is_critical: false,
      source: "manual"
    })
    setEditingMilestone(null)
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '₪0'
    return `₪${amount.toLocaleString('he-IL')}`
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('he-IL')
  }

  if (loading || !project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </DashboardLayout>
    )
  }

  const typeConfig = PROJECT_TYPES[project.project_type as keyof typeof PROJECT_TYPES] || PROJECT_TYPES.other
  const StatusIcon = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG].icon

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalMilestones = milestones.length
  const budgetUsedPercentage = project.approved_budget 
    ? (project.actual_cost / project.approved_budget) * 100 
    : 0

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה לפרויקטים
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{typeConfig.icon}</span>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">
                    {project.name}
                  </h1>
                  <p className="text-purple-100">{project.project_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`${STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG].color} border-2`}>
                  <StatusIcon className="h-4 w-4 ml-1" />
                  {STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG].label}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  {typeConfig.label}
                </Badge>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => router.push(`/projects/${project.id}/edit`)}
            >
              <Edit className="h-4 w-4 ml-2" />
              ערוך פרויקט
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">התקדמות</p>
              <p className="text-2xl font-bold text-purple-600">{project.progress_percentage}%</p>
              <Progress value={project.progress_percentage} className="h-2 mt-2" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">אבני דרך</p>
              <p className="text-2xl font-bold text-blue-600">
                {completedMilestones}/{totalMilestones}
              </p>
              <p className="text-xs text-gray-500 mt-1">הושלמו</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">תקציב</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(project.approved_budget || project.estimated_budget)}
              </p>
              <p className="text-xs text-gray-500 mt-1">מאושר</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">בוצע</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(project.actual_cost)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {budgetUsedPercentage.toFixed(0)}% מהתקציב
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - RTL Fixed */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="overview" className="space-y-6" dir="rtl">
            {/* Tabs List - Fixed to Right */}
            <TabsList className="bg-white border shadow-sm grid grid-cols-4 w-full">
              <TabsTrigger value="overview" className="gap-2">
                <Activity className="h-4 w-4" />
                סקירה
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-2">
                <Target className="h-4 w-4" />
                אבני דרך ({milestones.length})
              </TabsTrigger>
              <TabsTrigger value="costs" className="gap-2">
                <DollarSign className="h-4 w-4" />
                עלויות
              </TabsTrigger>
              <TabsTrigger value="pos" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                הזמנות רכש ({purchaseOrders.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Budget Card - RIGHT */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      תקציב
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">מחיר לקוח</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(project.quoted_price)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">תקציב מאושר</span>
                      <span className="font-bold">
                        {formatCurrency(project.approved_budget)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">הוצאו בפועל</span>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(project.actual_cost)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold">רווח צפוי</span>
                      <span className={`font-bold ${(project.quoted_price || 0) - project.actual_cost > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency((project.quoted_price || 0) - project.actual_cost)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Info - LEFT */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>פרטי פרויקט</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          לקוח
                        </Label>
                        <p className="font-medium mt-1">{client?.name}</p>
                        {client?.contact_phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            {client.contact_phone}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          בניין
                        </Label>
                        <p className="font-medium mt-1">{building?.address}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {building?.city}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-600 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          תאריך התחלה
                        </Label>
                        <p className="font-medium mt-1">
                          {formatDate(project.actual_start_date || project.estimated_start_date)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-600 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          תאריך סיום משוער
                        </Label>
                        <p className="font-medium mt-1">
                          {formatDate(project.estimated_end_date)}
                        </p>
                      </div>
                    </div>
                    {project.notes && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-gray-600">הערות</Label>
                          <p className="text-sm mt-2 text-gray-700 whitespace-pre-wrap">
                            {project.notes}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    ציר זמן - התקדמות הפרויקט
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>טרם נרשמו אירועים</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {timeline.map((event, index) => {
                        const Icon = event.icon
                        return (
                          <div key={event.id} className="flex gap-4 items-start">
                            <div className={`p-2 rounded-lg ${event.color} shrink-0`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-semibold text-gray-900">{event.title}</h4>
                                <span className="text-sm text-gray-500 whitespace-nowrap">
                                  {formatDate(event.date)}
                                </span>
                              </div>
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                              )}
                              {event.type === 'milestone' && event.metadata?.source_details && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {event.metadata.source_details}
                                </p>
                              )}
                            </div>
                            {index < timeline.length - 1 && (
                              <div className="absolute right-[18px] top-12 w-0.5 h-8 bg-gray-200" 
                                   style={{ marginRight: '8px' }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      אבני דרך
                    </CardTitle>
                    <Button onClick={() => setMilestoneDialogOpen(true)}>
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף אבן דרך
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {milestones.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="mb-2">לא הוגדרו אבני דרך</p>
                      <p className="text-sm">אבני דרך מתעדכנות אוטומטית או ניתן להוסיף ידנית</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map((milestone) => {
                        const statusConfig = MILESTONE_STATUS[milestone.status]
                        const StatusIcon = statusConfig.icon
                        const sourceConfig = MILESTONE_SOURCES.find(s => s.value === milestone.source)
                        const SourceIcon = sourceConfig?.icon || Edit

                        return (
                          <div
                            key={milestone.id}
                            className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
                                  {milestone.is_critical && (
                                    <Badge variant="destructive" className="text-xs">
                                      קריטי
                                    </Badge>
                                  )}
                                  <Badge className={statusConfig.color}>
                                    <StatusIcon className="h-3 w-3 ml-1" />
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                {milestone.description && (
                                  <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    יעד: {formatDate(milestone.due_date)}
                                  </span>
                                  {milestone.completed_date && (
                                    <span className="flex items-center gap-1 text-green-600">
                                      <CheckCircle2 className="h-3 w-3" />
                                      הושלם: {formatDate(milestone.completed_date)}
                                    </span>
                                  )}
                                  <span className={`flex items-center gap-1 ${sourceConfig?.color}`}>
                                    <SourceIcon className="h-3 w-3" />
                                    {milestone.source === 'manual' ? 'ידני' : 'אוטומטי'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={milestone.status}
                                  onValueChange={(value) => handleUpdateMilestoneStatus(milestone.id, value)}
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_started">לא התחיל</SelectItem>
                                    <SelectItem value="in_progress">בתהליך</SelectItem>
                                    <SelectItem value="completed">הושלם</SelectItem>
                                    <SelectItem value="cancelled">בוטל</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Costs Tab */}
            <TabsContent value="costs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    מעקב עלויות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">מעקב עלויות מפורט</p>
                    <p className="text-sm">יתעדכן אוטומטית מהזמנות רכש וטכנאים בשטח</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Purchase Orders Tab */}
            <TabsContent value="pos">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-orange-600" />
                      הזמנות רכש
                    </CardTitle>
                    <Button onClick={() => router.push(`/purchase-orders?project=${project.id}`)}>
                      <Plus className="h-4 w-4 ml-2" />
                      הזמנה חדשה
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {purchaseOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>טרם בוצעו הזמנות רכש לפרויקט זה</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {purchaseOrders.map((po) => (
                        <div
                          key={po.id}
                          className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => router.push(`/purchase-orders/${po.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{po.po_number}</h4>
                              <p className="text-sm text-gray-600">{po.supplier}</p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-green-600">
                                {formatCurrency(po.total_amount)}
                              </p>
                              <p className="text-sm text-gray-500">{formatDate(po.order_date)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>הוסף אבן דרך חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם אבן הדרך</Label>
              <Input
                value={milestoneFormData.name}
                onChange={(e) => setMilestoneFormData({...milestoneFormData, name: e.target.value})}
                placeholder="לדוגמה: אישור הצעת מחיר"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={milestoneFormData.description}
                onChange={(e) => setMilestoneFormData({...milestoneFormData, description: e.target.value})}
                placeholder="פרטים נוספים..."
                rows={3}
              />
            </div>
            <div>
              <Label>תאריך יעד</Label>
              <Input
                type="date"
                value={milestoneFormData.due_date}
                onChange={(e) => setMilestoneFormData({...milestoneFormData, due_date: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="critical"
                checked={milestoneFormData.is_critical}
                onChange={(e) => setMilestoneFormData({...milestoneFormData, is_critical: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="critical" className="cursor-pointer">
                אבן דרך קריטית
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateMilestone} disabled={!milestoneFormData.name || !milestoneFormData.due_date}>
              הוסף
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}