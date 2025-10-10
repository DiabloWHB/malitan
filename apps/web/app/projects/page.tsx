"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import {
  Loader2,
  Plus,
  Search,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Building2,
  User,
  Wrench,
  Filter
} from "lucide-react"

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
  created_at: string
}

type Client = {
  id: string
  name: string
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

const PROJECT_TYPES = {
  modernization: { label: 'שדרוג ומודרניזציה', icon: '🔄', color: 'bg-blue-100 text-blue-800' },
  new_installation: { label: 'התקנה חדשה', icon: '🆕', color: 'bg-green-100 text-green-800' },
  component_replacement: { label: 'החלפת רכיבים', icon: '🔧', color: 'bg-purple-100 text-purple-800' },
  renovation: { label: 'שיפוץ', icon: '🎨', color: 'bg-yellow-100 text-yellow-800' },
  major_repair: { label: 'תיקון גדול', icon: '⚠️', color: 'bg-orange-100 text-orange-800' },
  other: { label: 'אחר', icon: '📋', color: 'bg-gray-100 text-gray-800' }
}

const STATUS_CONFIG = {
  planning: { label: 'תכנון', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock },
  quotation: { label: 'הצעת מחיר', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: DollarSign },
  approved: { label: 'אושר', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  in_progress: { label: 'בביצוע', color: 'bg-green-100 text-green-800 border-green-200', icon: TrendingUp },
  on_hold: { label: 'מושהה', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle },
  completed: { label: 'הושלם', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
}

const PRIORITY_CONFIG = {
  low: { label: 'נמוכה', color: 'text-gray-600' },
  medium: { label: 'בינונית', color: 'text-blue-600' },
  high: { label: 'גבוהה', color: 'text-orange-600' },
  critical: { label: 'קריטית', color: 'text-red-600' }
}

export default function ProjectsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    project_type: "modernization" as string,
    client_id: "",
    building_id: "",
    lead_technician_id: "",
    estimated_start_date: "",
    estimated_end_date: "",
    estimated_budget: "" as string | number,
    quoted_price: "" as string | number,
    priority: "medium" as string,
    notes: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      if (clientsError) throw clientsError
      setClients(clientsData || [])

      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, address, city')
        .order('address', { ascending: true })

      if (buildingsError) throw buildingsError
      setBuildings(buildingsData || [])

      // Fetch technicians
      const { data: techniciansData, error: techniciansError } = await supabase
        .from('technicians')
        .select('id, full_name')
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      if (techniciansError) throw techniciansError
      setTechnicians(techniciansData || [])

    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const active = projects.filter(p => 
      ['planning', 'quotation', 'approved', 'in_progress', 'on_hold'].includes(p.status)
    ).length
    const inProgress = projects.filter(p => p.status === 'in_progress').length
    const completed = projects.filter(p => p.status === 'completed').length
    const totalValue = projects
      .filter(p => p.status !== 'cancelled')
      .reduce((sum, p) => sum + (p.quoted_price || 0), 0)

    return { active, inProgress, completed, totalValue }
  }, [projects])

  const filteredProjects = useMemo(() => {
    let filtered = projects

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchLower) ||
        project.project_number.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower)
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(p => p.project_type === typeFilter)
    }

    return filtered
  }, [projects, searchQuery, statusFilter, typeFilter])

  const openAddDialog = () => {
    setEditingProject(null)
    setFormData({
      name: "",
      description: "",
      project_type: "modernization",
      client_id: "",
      building_id: "",
      lead_technician_id: "",
      estimated_start_date: "",
      estimated_end_date: "",
      estimated_budget: "",
      quoted_price: "",
      priority: "medium",
      notes: ""
    })
    setDialogOpen(true)
  }

  const openEditDialog = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || "",
      project_type: project.project_type,
      client_id: project.client_id,
      building_id: project.building_id,
      lead_technician_id: project.lead_technician_id || "",
      estimated_start_date: project.estimated_start_date || "",
      estimated_end_date: project.estimated_end_date || "",
      estimated_budget: project.estimated_budget || "",
      quoted_price: project.quoted_price || "",
      priority: project.priority,
      notes: ""
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        toast({ title: "שגיאה", description: "יש להזין שם פרויקט", variant: "destructive" })
        return
      }

      if (!formData.client_id) {
        toast({ title: "שגיאה", description: "יש לבחור לקוח", variant: "destructive" })
        return
      }

      if (!formData.building_id) {
        toast({ title: "שגיאה", description: "יש לבחור בניין", variant: "destructive" })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) throw new Error("Company not found")

      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        project_type: formData.project_type,
        client_id: formData.client_id,
        building_id: formData.building_id,
        lead_technician_id: formData.lead_technician_id || null,
        estimated_start_date: formData.estimated_start_date || null,
        estimated_end_date: formData.estimated_end_date || null,
        estimated_budget: formData.estimated_budget ? Number(formData.estimated_budget) : null,
        quoted_price: formData.quoted_price ? Number(formData.quoted_price) : null,
        priority: formData.priority
      }

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id)

        if (error) throw error

        toast({
          title: "✅ הפרויקט עודכן בהצלחה",
          description: `${projectData.name} עודכן במערכת`
        })
      } else {
        // Generate project number
        const { data: projectNumber } = await supabase
          .rpc('generate_project_number', { company_uuid: profile.company_id })

        const { error } = await supabase
          .from('projects')
          .insert([{
            ...projectData,
            company_id: profile.company_id,
            project_number: projectNumber,
            status: 'planning',
            created_by: user.id
          }])

        if (error) throw error

        toast({
          title: "✅ הפרויקט נוצר בהצלחה",
          description: `${projectData.name} נוסף למערכת`
        })
      }

      setDialogOpen(false)
      fetchData()

    } catch (error: any) {
      console.error('Error saving project:', error)
      toast({
        title: "שגיאה בשמירה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (project: Project) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${project.name}?`)) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error

      toast({
        title: "✅ הפרויקט נמחק",
        description: `${project.name} נמחק מהמערכת`
      })

      fetchData()

    } catch (error: any) {
      console.error('Error deleting project:', error)
      toast({
        title: "שגיאה במחיקה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'לא ידוע'
  }

  const getBuildingAddress = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId)
    return building ? `${building.address}, ${building.city}` : 'לא ידוע'
  }

  const getTechnicianName = (technicianId: string | null) => {
    if (!technicianId) return 'לא משובץ'
    return technicians.find(t => t.id === technicianId)?.full_name || 'לא ידוע'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא צוין'
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'לא צוין'
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                פרויקטים
              </h1>
              <p className="text-purple-100">
                ניהול פרויקטים גדולים - מודרניזציות, התקנות והחלפות
              </p>
            </div>
            <Button 
              onClick={openAddDialog}
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              <Plus className="h-4 w-4 ml-2" />
              פרויקט חדש
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-100 mb-1">פרויקטים פעילים</p>
                    <p className="text-2xl font-bold text-white">{stats.active}</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-purple-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-100 mb-1">בביצוע</p>
                    <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-100 mb-1">הושלמו</p>
                    <p className="text-2xl font-bold text-white">{stats.completed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-100 mb-1">שווי כולל</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(stats.totalValue)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-300" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם או מספר פרויקט..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="כל הסוגים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                {Object.entries(PROJECT_TYPES).map(([key, type]) => (
                  <SelectItem key={key} value={key}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Briefcase className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  אין פרויקטים
                </p>
                <p className="text-gray-600 mb-4">
                  {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                    ? "נסה לשנות את הפילטרים"
                    : "התחל להוסיף פרויקטים גדולים"}
                </p>
                {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 ml-2" />
                    פרויקט ראשון
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProjects.map(project => {
                const StatusIcon = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG].icon
                const typeConfig = PROJECT_TYPES[project.project_type as keyof typeof PROJECT_TYPES]
                
                return (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{typeConfig.icon}</span>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                {project.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {project.project_number}
                              </p>
                            </div>
                          </div>
                          <Badge className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Badge className={`${STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG].color} border`}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG].label}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      {project.description && (
                        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      {/* Details */}
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{getClientName(project.client_id)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="h-4 w-4" />
                          <span className="truncate">{getBuildingAddress(project.building_id)}</span>
                        </div>
                        {project.lead_technician_id && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Wrench className="h-4 w-4" />
                            <span>{getTechnicianName(project.lead_technician_id)}</span>
                          </div>
                        )}
                      </div>

                      <Separator className="my-4" />

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2 text-sm">
                          <span className="text-gray-600">התקדמות</span>
                          <span className="font-semibold text-gray-900">
                            {project.progress_percentage}%
                          </span>
                        </div>
                        <Progress value={project.progress_percentage} className="h-2" />
                      </div>

                      {/* Budget */}
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">תקציב</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(project.approved_budget || project.estimated_budget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">בפועל</p>
                          <p className="font-semibold text-blue-600">
                            {formatCurrency(project.actual_cost)}
                          </p>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>התחלה: {formatDate(project.estimated_start_date)}</span>
                        </div>
                        {project.estimated_end_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>סיום: {formatDate(project.estimated_end_date)}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/projects/${project.id}`)
                          }}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 ml-1" />
                          פרטים
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(project)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(project)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingProject ? `עריכת ${editingProject.name}` : "פרויקט חדש"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פרטים בסיסיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">שם הפרויקט *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="שדרוג מעלית בניין A"
                  />
                </div>

                <div>
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="תיאור מפורט של הפרויקט..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project_type">סוג פרויקט *</Label>
                    <Select
                      value={formData.project_type}
                      onValueChange={(val) => setFormData({ ...formData, project_type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROJECT_TYPES).map(([key, type]) => (
                          <SelectItem key={key} value={key}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
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
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">שיוכים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client_id">לקוח *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(val) => setFormData({ ...formData, client_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="building_id">בניין *</Label>
                  <Select
                    value={formData.building_id}
                    onValueChange={(val) => setFormData({ ...formData, building_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר בניין" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map(building => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.address}, {building.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="lead_technician_id">טכנאי ראשי</Label>
                  <Select
                    value={formData.lead_technician_id}
                    onValueChange={(val) => setFormData({ ...formData, lead_technician_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר טכנאי (אופציונלי)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא</SelectItem>
                      {technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Budget & Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">תקציב ולו"ז</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated_budget">תקציב משוער (₪)</Label>
                    <Input
                      id="estimated_budget"
                      type="number"
                      min="0"
                      value={formData.estimated_budget}
                      onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="quoted_price">מחיר ללקוח (₪)</Label>
                    <Input
                      id="quoted_price"
                      type="number"
                      min="0"
                      value={formData.quoted_price}
                      onChange={(e) => setFormData({ ...formData, quoted_price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated_start_date">תאריך התחלה משוער</Label>
                    <Input
                      id="estimated_start_date"
                      type="date"
                      value={formData.estimated_start_date}
                      onChange={(e) => setFormData({ ...formData, estimated_start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="estimated_end_date">תאריך סיום משוער</Label>
                    <Input
                      id="estimated_end_date"
                      type="date"
                      value={formData.estimated_end_date}
                      onChange={(e) => setFormData({ ...formData, estimated_end_date: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave}>
              <Briefcase className="h-4 w-4 ml-2" />
              {editingProject ? "עדכן" : "צור פרויקט"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}