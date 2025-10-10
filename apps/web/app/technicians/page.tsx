"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Wrench,
  Phone,
  Mail,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Edit,
  Trash2,
  Shield,
  AlertCircle,
  CheckCircle,
  X
} from "lucide-react"

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
  total_hours_worked: number
  average_response_time_hours: number | null
  customer_rating_avg: number | null
  completion_rate: number | null
}

const SPECIALIZATIONS = [
  { value: 'hydraulic', label: 'הידראולי' },
  { value: 'traction', label: 'משיכה (Traction)' },
  { value: 'mrl', label: 'ללא חדר מכונות (MRL)' },
  { value: 'vacuum', label: 'ואקום' },
  { value: 'modernization', label: 'שדרוג ומודרניזציה' },
  { value: 'doors', label: 'דלתות' },
  { value: 'controls', label: 'בקרה' },
  { value: 'safety_systems', label: 'מערכות בטיחות' }
]

const DAYS_OF_WEEK = [
  { value: 'sunday', label: 'ראשון' },
  { value: 'monday', label: 'שני' },
  { value: 'tuesday', label: 'שלישי' },
  { value: 'wednesday', label: 'רביעי' },
  { value: 'thursday', label: 'חמישי' },
  { value: 'friday', label: 'שישי' },
  { value: 'saturday', label: 'שבת' }
]

const STATUS_CONFIG = {
  active: { label: 'פעיל', color: 'bg-green-500', icon: UserCheck },
  on_leave: { label: 'בחופשה', color: 'bg-orange-500', icon: Clock },
  inactive: { label: 'לא פעיל', color: 'bg-gray-500', icon: UserX }
}

export default function TechniciansPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [technicianToDelete, setTechnicianToDelete] = useState<Technician | null>(null)

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    employee_id: "",
    specialization: [] as string[],
    experience_years: "" as string | number,
    status: "active" as "active" | "on_leave" | "inactive",
    available_days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as string[],
    working_hours_start: "08:00",
    working_hours_end: "17:00",
    hire_date: "",
    hourly_rate: "" as string | number,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: ""
  })

  useEffect(() => {
    loadTechnicians()
  }, [])

  const loadTechnicians = async () => {
    try {
      setLoading(true)

      const { data: techniciansData, error } = await supabase
        .from("technicians")
        .select("*")
        .order("full_name", { ascending: true })

      if (error) throw error

      setTechnicians(techniciansData || [])
    } catch (error: any) {
      console.error("Error loading technicians:", error)
      toast({
        title: "שגיאה בטעינת טכנאים",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toast({
        title: "שגיאה",
        description: "נא למלא שם מלא וטלפון",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("משתמש לא מחובר")

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (!profile?.company_id) throw new Error("לא נמצא company_id")

      const payload = {
        company_id: profile.company_id,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        employee_id: formData.employee_id.trim() || null,
        specialization: formData.specialization,
        experience_years: formData.experience_years ? parseInt(formData.experience_years as string) : null,
        status: formData.status,
        available_days: formData.available_days,
        working_hours_start: formData.working_hours_start || null,
        working_hours_end: formData.working_hours_end || null,
        hire_date: formData.hire_date || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate as string) : null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        notes: formData.notes.trim() || null,
        created_by: user.id
      }

      if (editingTechnician) {
        const { error } = await supabase
          .from("technicians")
          .update(payload)
          .eq("id", editingTechnician.id)

        if (error) throw error

        toast({
          title: "הצלחה",
          description: "הטכנאי עודכן בהצלחה"
        })
      } else {
        const { error } = await supabase
          .from("technicians")
          .insert([payload])

        if (error) throw error

        toast({
          title: "הצלחה",
          description: "הטכנאי נוסף בהצלחה"
        })
      }

      setDialogOpen(false)
      resetForm()
      loadTechnicians()
    } catch (error: any) {
      console.error("Error saving technician:", error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleDelete = async () => {
    if (!technicianToDelete) return

    try {
      const { error } = await supabase
        .from("technicians")
        .delete()
        .eq("id", technicianToDelete.id)

      if (error) throw error

      toast({
        title: "הצלחה",
        description: "הטכנאי נמחק בהצלחה"
      })

      setDeleteDialogOpen(false)
      setTechnicianToDelete(null)
      loadTechnicians()
    } catch (error: any) {
      console.error("Error deleting technician:", error)
      toast({
        title: "שגיאה במחיקה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const openAddDialog = () => {
    resetForm()
    setEditingTechnician(null)
    setDialogOpen(true)
  }

  const openEditDialog = (technician: Technician) => {
    setEditingTechnician(technician)
    setFormData({
      full_name: technician.full_name,
      phone: technician.phone,
      email: technician.email || "",
      employee_id: technician.employee_id || "",
      specialization: technician.specialization || [],
      experience_years: technician.experience_years || "",
      status: technician.status,
      available_days: technician.available_days || [],
      working_hours_start: technician.working_hours_start || "08:00",
      working_hours_end: technician.working_hours_end || "17:00",
      hire_date: technician.hire_date || "",
      hourly_rate: technician.hourly_rate || "",
      emergency_contact_name: technician.emergency_contact_name || "",
      emergency_contact_phone: technician.emergency_contact_phone || "",
      notes: technician.notes || ""
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      email: "",
      employee_id: "",
      specialization: [],
      experience_years: "",
      status: "active",
      available_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      working_hours_start: "08:00",
      working_hours_end: "17:00",
      hire_date: "",
      hourly_rate: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      notes: ""
    })
  }

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(spec)
        ? prev.specialization.filter(s => s !== spec)
        : [...prev.specialization, spec]
    }))
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day]
    }))
  }

  const filteredTechnicians = useMemo(() => {
    let filtered = technicians

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(tech =>
        tech.full_name.toLowerCase().includes(searchLower) ||
        tech.phone.includes(searchQuery) ||
        tech.email?.toLowerCase().includes(searchLower) ||
        tech.employee_id?.toLowerCase().includes(searchLower)
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(tech => tech.status === statusFilter)
    }

    return filtered
  }, [technicians, searchQuery, statusFilter])

  const stats = useMemo(() => {
    const active = technicians.filter(t => t.status === 'active').length
    const onLeave = technicians.filter(t => t.status === 'on_leave').length
    const inactive = technicians.filter(t => t.status === 'inactive').length

    return {
      total: technicians.length,
      active,
      onLeave,
      inactive
    }
  }, [technicians])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">טכנאים</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ניהול צוות הטכנאים וההקצאות
            </p>
          </div>
          <Button onClick={openAddDialog} size="lg">
            <Plus className="h-5 w-5 ml-2" />
            טכנאי חדש
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">סה"כ טכנאים</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.total}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">פעילים</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.active}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">בחופשה</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.onLeave}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">לא פעילים</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {stats.inactive}
                  </p>
                </div>
                <UserX className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חפש טכנאי לפי שם, טלפון, או מספר עובד..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="סינון לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="active">פעילים</SelectItem>
              <SelectItem value="on_leave">בחופשה</SelectItem>
              <SelectItem value="inactive">לא פעילים</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all") && (
            <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
              <X className="h-4 w-4 ml-2" />
              נקה סינון
            </Button>
          )}
        </div>
      </div>

      {/* Technicians Grid */}
      <div className="p-6">
        {filteredTechnicians.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== "all" ? "לא נמצאו טכנאים" : "אין טכנאים"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "נסה לשנות את הפילטרים"
                  : "התחל בהוספת הטכנאי הראשון שלך"
                }
              </p>
              {searchQuery || statusFilter !== "all" ? (
                <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                  נקה סינון
                </Button>
              ) : (
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף טכנאי
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechnicians.map(technician => {
              const statusConfig = STATUS_CONFIG[technician.status]

              return (
                <Card
                  key={technician.id}
                  onClick={() => router.push(`/technicians/${technician.id}`)}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                          {technician.full_name}
                        </h3>
                        {technician.employee_id && (
                          <p className="text-xs text-gray-500 font-mono">
                            מס' עובד: {technician.employee_id}
                          </p>
                        )}
                      </div>
                      <Badge className={`${statusConfig.color} text-white`}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Contact */}
                    <div className="space-y-2 mb-4">
                      <a
                        href={`tel:${technician.phone}`}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
                      >
                        <Phone className="h-3 w-3" />
                        <span dir="ltr">{technician.phone}</span>
                      </a>
                      {technician.email && (
                        <a
                          href={`mailto:${technician.email}`}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{technician.email}</span>
                        </a>
                      )}
                    </div>

                    {/* Specializations */}
                    {technician.specialization && technician.specialization.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          התמחויות:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {technician.specialization.map(spec => {
                            const specLabel = SPECIALIZATIONS.find(s => s.value === spec)?.label || spec
                            return (
                              <Badge key={spec} variant="secondary" className="text-xs">
                                {specLabel}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    {technician.experience_years && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <Award className="h-4 w-4" />
                        <span>{technician.experience_years} שנות ניסיון</span>
                      </div>
                    )}

                    <Separator className="my-3" />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/technicians/${technician.id}`)}
                      >
                        <TrendingUp className="h-3 w-3 ml-2" />
                        פרופיל
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(technician)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTechnicianToDelete(technician)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTechnician ? "עריכת טכנאי" : "טכנאי חדש"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                פרטים אישיים
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="full_name">שם מלא *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="משה כהן"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">טלפון *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="050-1234567"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="moshe@example.com"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="employee_id">מספר עובד</Label>
                  <Input
                    id="employee_id"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    placeholder="לדוגמה: EMP001"
                  />
                </div>

                <div>
                  <Label htmlFor="experience_years">שנות ניסיון</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Professional Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                פרטים מקצועיים
              </h3>

              <div>
                <Label>התמחויות</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SPECIALIZATIONS.map(spec => (
                    <div key={spec.value} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`spec-${spec.value}`}
                        checked={formData.specialization.includes(spec.value)}
                        onCheckedChange={() => toggleSpecialization(spec.value)}
                      />
                      <Label htmlFor={`spec-${spec.value}`} className="cursor-pointer text-sm">
                        {spec.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">סטטוס</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="on_leave">בחופשה</SelectItem>
                      <SelectItem value="inactive">לא פעיל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="hire_date">תאריך תחילת עבודה</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Availability */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                זמינות
              </h3>

              <div>
                <Label>ימי עבודה</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day.value} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={formData.available_days.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="cursor-pointer text-sm">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="working_hours_start">שעת התחלה</Label>
                  <Input
                    id="working_hours_start"
                    type="time"
                    value={formData.working_hours_start}
                    onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="working_hours_end">שעת סיום</Label>
                  <Input
                    id="working_hours_end"
                    type="time"
                    value={formData.working_hours_end}
                    onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                איש קשר לחירום
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">שם</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    placeholder="שרה כהן"
                  />
                </div>

                <div>
                  <Label htmlFor="emergency_contact_phone">טלפון</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    placeholder="052-9876543"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="hourly_rate">תעריף שעתי (₪)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  placeholder="150"
                />
              </div>

              <div>
                <Label htmlFor="notes">הערות</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות כלליות על הטכנאי..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave}>
              {editingTechnician ? "עדכן" : "הוסף"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת טכנאי</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              האם אתה בטוח שברצונך למחוק את הטכנאי{" "}
              <strong>{technicianToDelete?.full_name}</strong>?
            </p>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
              <CardContent className="p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ⚠️ פעולה זו תמחק את הטכנאי לצמיתות ולא ניתן לשחזר אותו.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              ביטול
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 ml-2" />
              מחק
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}