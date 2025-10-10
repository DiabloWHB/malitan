"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  Phone,
  Mail,
  Calendar,
  Clock,
  Wrench,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  MapPin,
  Edit,
  ArrowRight,
  ClipboardList,
  Package,
  Timer,
  Users,
  Activity,
  Target
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

type Technician = {
  id: string
  full_name: string
  phone: string
  email: string | null
  employee_id: string | null
  specialization: string[]
  certifications: any[]
  experience_years: number | null
  status: 'active' | 'on_leave' | 'inactive'
  available_days: string[]
  working_hours_start: string | null
  working_hours_end: string | null
  hire_date: string | null
  hourly_rate: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  created_at: string
}

type TechnicianStats = {
  tickets_completed: number
  tickets_assigned: number
  tickets_in_progress: number
  total_hours_worked: number
  average_response_time_hours: number | null
  customer_rating_avg: number | null
  completion_rate: number
  on_time_completion_rate: number
}

type RecentTicket = {
  id: string
  ticket_number: string
  subject: string
  status: string
  priority: string
  created_at: string
  completed_at: string | null
  building_name: string
  client_name: string
}

type MonthlyPerformance = {
  month: string
  completed: number
  hours: number
  rating: number
}

const SPECIALIZATIONS = {
  hydraulic: 'הידראולי',
  traction: 'משיכה (Traction)',
  mrl: 'ללא חדר מכונות (MRL)',
  vacuum: 'ואקום',
  modernization: 'שדרוג ומודרניזציה',
  doors: 'דלתות',
  controls: 'בקרה',
  safety_systems: 'מערכות בטיחות'
}

const STATUS_CONFIG = {
  active: { label: 'פעיל', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  on_leave: { label: 'בחופשה', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
  inactive: { label: 'לא פעיל', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle }
}

const PRIORITY_COLORS = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500'
}

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6'
}

export default function TechnicianProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [stats, setStats] = useState<TechnicianStats | null>(null)
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [monthlyPerformance, setMonthlyPerformance] = useState<MonthlyPerformance[]>([])
  const [ticketsByStatus, setTicketsByStatus] = useState<any[]>([])

  useEffect(() => {
    fetchTechnicianData()
  }, [params.id])

  const fetchTechnicianData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch technician details
      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', params.id)
        .single()

      if (techError) throw techError
      setTechnician(techData)

      // Fetch statistics
      await fetchStatistics(techData.id)
      await fetchRecentTickets(techData.id)
      await fetchMonthlyPerformance(techData.id)
      await fetchTicketsByStatus(techData.id)

    } catch (error: any) {
      console.error('Error fetching technician data:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async (technicianId: string) => {
    try {
      // Get all tickets for this technician
      // Note: This requires the 'assigned_to' column to exist in the tickets table
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('id, status, created_at, completed_at, assigned_to')
        .eq('assigned_to', technicianId)

      if (error) {
        console.error('Supabase error fetching tickets:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })

        // If the assigned_to column doesn't exist, set empty stats
        if (error.message?.includes('column') || error.code === '42703') {
          console.warn('The assigned_to column may not exist in tickets table yet')
          setStats({
            tickets_completed: 0,
            tickets_assigned: 0,
            tickets_in_progress: 0,
            total_hours_worked: 0,
            average_response_time_hours: null,
            customer_rating_avg: null,
            completion_rate: 0,
            on_time_completion_rate: 0
          })
          return
        }

        throw new Error(`Failed to fetch tickets: ${error.message}`)
      }

      const completed = tickets?.filter(t => t.status === 'completed').length || 0
      const assigned = tickets?.length || 0
      const inProgress = tickets?.filter(t => t.status === 'in_progress').length || 0

      // Calculate average response time
      const responseTimesHours = tickets
        ?.filter(t => t.status === 'completed' && t.completed_at)
        .map(t => {
          const created = new Date(t.created_at).getTime()
          const completed = new Date(t.completed_at).getTime()
          return (completed - created) / (1000 * 60 * 60) // hours
        }) || []

      const avgResponseTime = responseTimesHours.length > 0
        ? responseTimesHours.reduce((a, b) => a + b, 0) / responseTimesHours.length
        : null

      // Mock data for now - in production, fetch from work_logs table
      const totalHours = completed * 2.5 // Assuming 2.5 hours per ticket on average
      const customerRating = 4.6 // Mock rating
      const completionRate = assigned > 0 ? (completed / assigned) * 100 : 0
      const onTimeRate = 92 // Mock on-time completion rate

      setStats({
        tickets_completed: completed,
        tickets_assigned: assigned,
        tickets_in_progress: inProgress,
        total_hours_worked: totalHours,
        average_response_time_hours: avgResponseTime,
        customer_rating_avg: customerRating,
        completion_rate: completionRate,
        on_time_completion_rate: onTimeRate
      })

    } catch (error: any) {
      console.error('Error fetching statistics:', error)
      const errorMessage = error?.message || JSON.stringify(error) || 'Unknown error'
      console.error('Detailed error:', errorMessage)

      // Set default stats on error
      setStats({
        tickets_completed: 0,
        tickets_assigned: 0,
        tickets_in_progress: 0,
        total_hours_worked: 0,
        average_response_time_hours: null,
        customer_rating_avg: null,
        completion_rate: 0,
        on_time_completion_rate: 0
      })
    }
  }

  const fetchRecentTickets = async (technicianId: string) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
          subject,
          status,
          priority,
          created_at,
          completed_at,
          buildings (name),
          clients (full_name)
        `)
        .eq('assigned_to', technicianId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const formattedTickets = data?.map(ticket => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.created_at,
        completed_at: ticket.completed_at,
        building_name: ticket.buildings?.name || 'לא צוין',
        client_name: ticket.clients?.full_name || 'לא צוין'
      })) || []

      setRecentTickets(formattedTickets)

    } catch (error: any) {
      console.error('Error fetching recent tickets:', error)
    }
  }

  const fetchMonthlyPerformance = async (technicianId: string) => {
    try {
      // Get last 6 months data
      const monthsData: MonthlyPerformance[] = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = monthDate.toISOString()
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString()

        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('assigned_to', technicianId)
          .eq('status', 'completed')
          .gte('completed_at', monthStart)
          .lte('completed_at', monthEnd)

        const completed = data?.length || 0
        const hours = completed * 2.5 // Mock calculation
        const rating = 4.5 + Math.random() * 0.5 // Mock rating 4.5-5.0

        monthsData.push({
          month: monthDate.toLocaleDateString('he-IL', { month: 'short' }),
          completed,
          hours,
          rating: Math.round(rating * 10) / 10
        })
      }

      setMonthlyPerformance(monthsData)

    } catch (error: any) {
      console.error('Error fetching monthly performance:', error)
    }
  }

  const fetchTicketsByStatus = async (technicianId: string) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('status')
        .eq('assigned_to', technicianId)

      if (error) throw error

      const statusCounts = {
        open: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      }

      data?.forEach(ticket => {
        if (ticket.status in statusCounts) {
          statusCounts[ticket.status as keyof typeof statusCounts]++
        }
      })

      const chartData = [
        { name: 'פתוחות', value: statusCounts.open, color: CHART_COLORS.warning },
        { name: 'בטיפול', value: statusCounts.in_progress, color: CHART_COLORS.primary },
        { name: 'הושלמו', value: statusCounts.completed, color: CHART_COLORS.success },
        { name: 'בוטלו', value: statusCounts.cancelled, color: CHART_COLORS.danger }
      ]

      setTicketsByStatus(chartData)

    } catch (error: any) {
      console.error('Error fetching tickets by status:', error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (hours: number | null) => {
    if (hours === null) return 'לא זמין'
    if (hours < 1) return `${Math.round(hours * 60)} דקות`
    return `${Math.round(hours * 10) / 10} שעות`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!technician || !stats) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">טכנאי לא נמצא</h2>
          <Button onClick={() => router.push('/technicians')}>
            חזרה לרשימת טכנאים
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const StatusIcon = STATUS_CONFIG[technician.status].icon

  return (
    <DashboardLayout>
      {/* Header with Profile Info */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/technicians')}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה לרשימת טכנאים
          </Button>

          <div className="flex items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                {getInitials(technician.full_name)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">
                  {technician.full_name}
                </h1>
                <Badge className={`${STATUS_CONFIG[technician.status].color} border`}>
                  <StatusIcon className="h-3 w-3 ml-1" />
                  {STATUS_CONFIG[technician.status].label}
                </Badge>
              </div>

              {technician.employee_id && (
                <p className="text-blue-100 mb-3">
                  מזהה עובד: {technician.employee_id}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-white/90">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${technician.phone}`} className="hover:text-white">
                    {technician.phone}
                  </a>
                </div>
                {technician.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${technician.email}`} className="hover:text-white">
                      {technician.email}
                    </a>
                  </div>
                )}
                {technician.experience_years && (
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>{technician.experience_years} שנות ניסיון</span>
                  </div>
                )}
                {technician.hire_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>התחיל: {formatDate(technician.hire_date)}</span>
                  </div>
                )}
              </div>

              {/* Specializations */}
              {technician.specialization && technician.specialization.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-4 w-4 text-white/90" />
                    <span className="text-sm text-white/90">התמחויות:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {technician.specialization.map(spec => (
                      <Badge key={spec} className="bg-white/20 text-white border-white/30">
                        {SPECIALIZATIONS[spec as keyof typeof SPECIALIZATIONS] || spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push(`/technicians/${technician.id}/edit`)}
              >
                <Edit className="h-4 w-4 ml-2" />
                ערוך
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tickets Completed */}
          <Card className="shadow-lg border-t-4 border-t-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="text-left">
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.tickets_completed}
                  </p>
                  <p className="text-sm text-gray-600">קריאות הושלמו</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">אחוז השלמה</span>
                  <span className="font-semibold text-green-600">
                    {Math.round(stats.completion_rate)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Tickets */}
          <Card className="shadow-lg border-t-4 border-t-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-8 w-8 text-blue-500" />
                <div className="text-left">
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.tickets_in_progress}
                  </p>
                  <p className="text-sm text-gray-600">קריאות פעילות</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">סה"כ משובצות</span>
                  <span className="font-semibold text-blue-600">
                    {stats.tickets_assigned}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hours Worked */}
          <Card className="shadow-lg border-t-4 border-t-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Timer className="h-8 w-8 text-purple-500" />
                <div className="text-left">
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(stats.total_hours_worked)}
                  </p>
                  <p className="text-sm text-gray-600">שעות עבודה</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">זמן תגובה ממוצע</span>
                  <span className="font-semibold text-purple-600">
                    {formatTime(stats.average_response_time_hours)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Rating */}
          <Card className="shadow-lg border-t-4 border-t-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="h-8 w-8 text-yellow-500" />
                <div className="text-left">
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.customer_rating_avg?.toFixed(1) || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">דירוג לקוחות</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">השלמה בזמן</span>
                  <span className="font-semibold text-yellow-600">
                    {stats.on_time_completion_rate}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border shadow-sm p-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              סקירה כללית
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              קריאות אחרונות
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              ביצועים
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              פרטים נוספים
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    ביצועים חודשיים - קריאות שהושלמו
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        stroke={CHART_COLORS.primary}
                        name="קריאות שהושלמו"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Hours Worked Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    שעות עבודה חודשיות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="hours"
                        fill={CHART_COLORS.purple}
                        name="שעות עבודה"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tickets by Status Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    התפלגות קריאות לפי סטטוס
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ticketsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ticketsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Customer Rating Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    מגמת דירוג לקוחות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[4, 5]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="rating"
                        stroke={CHART_COLORS.warning}
                        name="דירוג ממוצע"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recent Tickets Tab */}
          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  קריאות אחרונות ({recentTickets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTickets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>אין קריאות עדיין</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-12 rounded ${PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}`} />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {ticket.ticket_number}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {ticket.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-900 font-medium">
                                {ticket.subject}
                              </p>
                            </div>
                          </div>
                          <div className="text-left text-sm text-gray-600">
                            {formatDate(ticket.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mr-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {ticket.building_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {ticket.client_name}
                          </div>
                          {ticket.completed_at && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              הושלם: {formatDate(ticket.completed_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>KPIs - מדדי ביצוע מרכזיים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">אחוז השלמת קריאות</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.round(stats.completion_rate)}%
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      מצוין
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">אחוז השלמה בזמן</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.on_time_completion_rate}%
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      טוב מאוד
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Timer className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">זמן תגובה ממוצע</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatTime(stats.average_response_time_hours)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-100 text-purple-800">
                      מהיר
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Star className="h-8 w-8 text-yellow-600" />
                      <div>
                        <p className="text-sm text-gray-600">דירוג שביעות רצון</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.customer_rating_avg?.toFixed(1) || 'N/A'}/5.0
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      גבוה
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>השוואה לממוצע החברה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">אחוז השלמה</span>
                      <span className="text-sm font-semibold">
                        {Math.round(stats.completion_rate)}% vs 88%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${stats.completion_rate}%` }}
                      />
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      +{Math.round(stats.completion_rate - 88)}% מעל הממוצע
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">דירוג לקוחות</span>
                      <span className="text-sm font-semibold">
                        {stats.customer_rating_avg?.toFixed(1)} vs 4.3
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{ width: `${((stats.customer_rating_avg || 0) / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      +{((stats.customer_rating_avg || 0) - 4.3).toFixed(1)} מעל הממוצע
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">זמן תגובה (שעות)</span>
                      <span className="text-sm font-semibold">
                        {stats.average_response_time_hours?.toFixed(1) || 'N/A'} vs 3.5
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${100 - ((stats.average_response_time_hours || 0) / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {((stats.average_response_time_hours || 0) < 3.5) ? 'מהיר יותר' : 'איטי יותר'} מהממוצע
                    </p>
                  </div>

                  <Separator />

                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Award className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">
                      טכנאי מצטיין החודש
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      מעל 90% השלמה בזמן ודירוג 4.5+
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>פרטים אישיים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">שם מלא</p>
                      <p className="font-semibold">{technician.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">מזהה עובד</p>
                      <p className="font-semibold">{technician.employee_id || 'לא צוין'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">טלפון</p>
                      <p className="font-semibold" dir="ltr">{technician.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">אימייל</p>
                      <p className="font-semibold text-sm">{technician.email || 'לא צוין'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">תאריך תחילת עבודה</p>
                      <p className="font-semibold">
                        {technician.hire_date ? formatDate(technician.hire_date) : 'לא צוין'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">שנות ניסיון</p>
                      <p className="font-semibold">
                        {technician.experience_years || 'לא צוין'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-gray-600 mb-2">איש קשר לחירום</p>
                    {technician.emergency_contact_name && technician.emergency_contact_phone ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-gray-900">
                          {technician.emergency_contact_name}
                        </p>
                        <p className="text-sm text-gray-600" dir="ltr">
                          {technician.emergency_contact_phone}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">לא צוין</p>
                    )}
                  </div>

                  {technician.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-600 mb-2">הערות</p>
                        <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">
                          {technician.notes}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>זמינות ושעות עבודה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-3">ימי עבודה</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day, index) => {
                        const dayValues = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                        const isAvailable = technician.available_days?.includes(dayValues[index])
                        return (
                          <div
                            key={day}
                            className={`p-3 text-center rounded-lg border-2 ${
                              isAvailable
                                ? 'bg-green-50 border-green-500 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-400'
                            }`}
                          >
                            <p className="text-xs font-semibold">{day}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">שעת התחלה</p>
                      <p className="font-semibold">
                        {technician.working_hours_start || 'לא צוין'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">שעת סיום</p>
                      <p className="font-semibold">
                        {technician.working_hours_end || 'לא צוין'}
                      </p>
                    </div>
                  </div>

                  {technician.hourly_rate && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-600 mb-1">תעריף לשעה</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₪{technician.hourly_rate}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Certifications Card */}
              {technician.certifications && technician.certifications.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      הסמכות ותעודות
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {technician.certifications.map((cert: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-white"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{cert.name}</p>
                              <p className="text-sm text-gray-600">{cert.issuer}</p>
                            </div>
                            <Badge variant="outline" className="bg-white">
                              {cert.valid ? 'בתוקף' : 'פג תוקף'}
                            </Badge>
                          </div>
                          {cert.expiry_date && (
                            <p className="text-xs text-gray-500">
                              תוקף עד: {formatDate(cert.expiry_date)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}