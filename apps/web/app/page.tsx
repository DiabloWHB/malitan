"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { StatsCard } from "@/components/ui/StatsCard"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  CheckCircle,
  User,
  TrendingUp,
  Plus,
  Download,
  Building2,
  Wrench,
  FileText,
  Clock,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

type Stats = {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  doneTickets: number
  criticalTickets: number
  totalBuildings: number
  totalElevators: number
}

type RecentTicket = {
  id: string
  title: string
  severity: string
  status: string
  created_at: string
  building?: { address: string; city: string }
}

const STATUS_CONFIG = {
  new: { label: "חדש", variant: "new" as const },
  assigned: { label: "שויך", variant: "assigned" as const },
  in_progress: { label: "בטיפול", variant: "progress" as const },
  waiting_parts: { label: "מחכה לחלקים", variant: "waiting" as const },
  done: { label: "הושלם", variant: "done" as const },
  cancelled: { label: "בוטל", variant: "cancelled" as const },
}

const SEVERITY_CONFIG = {
  low: { label: "נמוכה", color: "text-gray-600" },
  medium: { label: "בינונית", color: "text-blue-600" },
  high: { label: "גבוהה", color: "text-orange-600" },
  critical: { label: "קריטית", color: "text-red-600" },
}

export default function DashboardPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    doneTickets: 0,
    criticalTickets: 0,
    totalBuildings: 0,
    totalElevators: 0,
  })
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      // טען קריאות
      const { data: tickets, error: tError } = await supabase
        .from("tickets")
        .select(`
          id,
          title,
          severity,
          status,
          created_at,
          building:buildings(address, city)
        `)
        .order("created_at", { ascending: false })

      if (tError) throw tError

      // טען בניינים
      const { data: buildings, error: bError } = await supabase
        .from("buildings")
        .select("id")

      if (bError) throw bError

      // טען מעליות
      const { data: elevators, error: eError } = await supabase
        .from("elevators")
        .select("id")

      if (eError) throw eError

      // חשב סטטיסטיקות
      const openTickets = tickets?.filter(t => 
        t.status === "new" || t.status === "assigned"
      ).length || 0

      const inProgressTickets = tickets?.filter(t => 
        t.status === "in_progress" || t.status === "waiting_parts"
      ).length || 0

      const doneTickets = tickets?.filter(t => 
        t.status === "done"
      ).length || 0

      const criticalTickets = tickets?.filter(t => 
        t.severity === "critical" && t.status !== "done" && t.status !== "cancelled"
      ).length || 0

      setStats({
        totalTickets: tickets?.length || 0,
        openTickets,
        inProgressTickets,
        doneTickets,
        criticalTickets,
        totalBuildings: buildings?.length || 0,
        totalElevators: elevators?.length || 0,
      })

      // 5 קריאות אחרונות
      setRecentTickets((tickets || []).slice(0, 5) as RecentTicket[])

    } catch (err: any) {
      toast({
        title: "שגיאה בטעינת נתונים",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">טוען נתונים...</p>
          </div>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">דף הבית</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">סקירה כללית של פעילות המערכת</p>
          </div>
          <div className="flex gap-3">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              קריאה חדשה
            </Button>
            <Button variant="secondary" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              ייצוא דוח
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="קריאות פעילות"
            value={stats.openTickets + stats.inProgressTickets}
            change={`${stats.openTickets} חדשות • ${stats.inProgressTickets} בטיפול`}
            changeType="neutral"
            icon={AlertTriangle}
            iconColor="red"
          />
          <StatsCard
            title="קריאות קריטיות"
            value={stats.criticalTickets}
            change={stats.criticalTickets > 0 ? "דורשות טיפול דחוף" : "אין קריאות קריטיות"}
            changeType={stats.criticalTickets > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
            iconColor="red"
          />
          <StatsCard
            title="בניינים במערכת"
            value={stats.totalBuildings}
            change={`${stats.totalElevators} מעליות`}
            changeType="neutral"
            icon={Building2}
            iconColor="blue"
          />
          <StatsCard
            title="קריאות הושלמו"
            value={stats.doneTickets}
            change={`מתוך ${stats.totalTickets} סה"כ`}
            changeType="positive"
            icon={CheckCircle}
            iconColor="green"
          />
        </div>

        {/* Critical Alert */}
        {stats.criticalTickets > 0 && (
          <Card className="mb-8 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="p-6">
              <div className="flex items-start space-x-reverse space-x-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 dark:text-red-200">
                    דורש תשומת לב
                  </h3>
                  <p className="text-red-700 dark:text-red-300 mt-1">
                    יש לך <strong>{stats.criticalTickets}</strong> קריאות קריטיות הדורשות טיפול מיידי
                  </p>
                  <Button variant="danger" size="sm" className="mt-3">
                    <Link href="/tickets" className="flex items-center">
                      צפה בקריאות
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Tickets Section */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">קריאות שירות אחרונות</h2>
              <Link href="/tickets" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                צפה בכל הקריאות
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentTickets.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">אין קריאות עדיין</p>
                <Button>
                  <Link href="/tickets" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    פתח קריאה ראשונה
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="border border-gray-200 rounded-xl p-5 hover-lift dark:border-slate-700 transition-all duration-200"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant={STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]?.variant || "new"}>
                            {STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]?.label || ticket.status}
                          </Badge>
                          <span className={`text-sm font-medium px-2 py-1 rounded-full ${SEVERITY_CONFIG[ticket.severity as keyof typeof SEVERITY_CONFIG]?.color || "text-gray-600"}`}>
                            {SEVERITY_CONFIG[ticket.severity as keyof typeof SEVERITY_CONFIG]?.label || ticket.severity}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-lg">
                          {ticket.title}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            📍 {ticket.building?.address}, {ticket.building?.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(ticket.created_at).toLocaleDateString('he-IL')}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="ghost">
                          <Link href={`/tickets/${ticket.id}`}>פתח</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <TrendingUp className="w-5 h-5 ml-2" />
                סיכום לפי סטטוס
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-reverse space-x-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-gray-900 dark:text-gray-100">חדשות</span>
                  </div>
                  <span className="font-semibold">{stats.openTickets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-reverse space-x-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-900 dark:text-gray-100">בטיפול</span>
                  </div>
                  <span className="font-semibold">{stats.inProgressTickets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-reverse space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-900 dark:text-gray-100">הושלמו</span>
                  </div>
                  <span className="font-semibold">{stats.doneTickets}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">סטטיסטיקות כלליות</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">סה"כ קריאות</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalTickets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">בניינים</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalBuildings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">מעליות</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalElevators}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">פעולות מהירות</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card hover className="p-6 cursor-pointer group">
                <Link href="/tickets" className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 dark:bg-primary-900/50">
                    <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">קריאות שירות</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ניהול קריאות</p>
                  </div>
                </Link>
              </Card>

              <Card hover className="p-6 cursor-pointer group">
                <Link href="/buildings" className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 dark:bg-blue-900/50">
                    <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">בניינים</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ניהול בניינים</p>
                  </div>
                </Link>
              </Card>

              <Card hover className="p-6 cursor-pointer group">
                <Link href="/elevators" className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 dark:bg-green-900/50">
                    <Wrench className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">מעליות</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ניהול מעליות</p>
                  </div>
                </Link>
              </Card>

              <Card hover className="p-6 cursor-pointer group">
                <Link href="/clients" className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 dark:bg-yellow-900/50">
                    <User className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">לקוחות</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ניהול לקוחות</p>
                  </div>
                </Link>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}