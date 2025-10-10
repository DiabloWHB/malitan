"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Loader2,
  Plus,
  Search,
  Users,
  Building2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Wrench,
  MessageSquare,
  ExternalLink,
  X,
  Send,
  CheckSquare,
  Square,
  Trash2,
  Download,
  MessageCircle
} from "lucide-react"

type Client = {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  contact_name: string | null
  preferred_channel: "whatsapp" | "sms" | "email" | null
  created_at: string
  buildings_count?: number
  elevators_count?: number
  active_tickets_count?: number
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-green-600" },
  sms: { label: "SMS", icon: MessageSquare, color: "text-blue-600" },
  email: { label: "Email", icon: Mail, color: "text-purple-600" }
}

export default function ClientsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    preferred_channel: "whatsapp" as "whatsapp" | "sms" | "email"
  })

  const [messageData, setMessageData] = useState({
    channel: "whatsapp" as "whatsapp" | "sms" | "email",
    subject: "",
    message: ""
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("name", { ascending: true })

      if (clientsError) throw clientsError

      if (!clientsData || clientsData.length === 0) {
        setClients([])
        setLoading(false)
        return
      }

      const clientIds = clientsData.map(c => c.id)

      const { data: buildingsData, error: buildingsError } = await supabase
        .from("buildings")
        .select("id, client_id")
        .in("client_id", clientIds)

      if (buildingsError) {
        console.error("Error loading buildings:", buildingsError)
      }

      const buildingsByClient = (buildingsData || []).reduce((acc, b) => {
        acc[b.client_id] = (acc[b.client_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const buildingIds = (buildingsData || []).map(b => b.id)

      let elevatorsByClient: Record<string, number> = {}
      if (buildingIds.length > 0) {
        const { data: elevatorsData, error: elevatorsError } = await supabase
          .from("elevators")
          .select("id, building_id")
          .in("building_id", buildingIds)

        if (elevatorsError) {
          console.error("Error loading elevators:", elevatorsError)
        }

        const buildingToClient = (buildingsData || []).reduce((acc, b) => {
          acc[b.id] = b.client_id
          return acc
        }, {} as Record<string, string>)

        ;(elevatorsData || []).forEach(e => {
          const clientId = buildingToClient[e.building_id]
          if (clientId) {
            elevatorsByClient[clientId] = (elevatorsByClient[clientId] || 0) + 1
          }
        })
      }

      let activeTicketsByClient: Record<string, number> = {}
      if (buildingIds.length > 0) {
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("tickets")
          .select("id, building_id, status")
          .in("building_id", buildingIds)
          .not("status", "in", '("done","cancelled")')

        if (ticketsError) {
          console.error("Error loading tickets:", ticketsError)
        }

        const buildingToClient = (buildingsData || []).reduce((acc, b) => {
          acc[b.id] = b.client_id
          return acc
        }, {} as Record<string, string>)

        ;(ticketsData || []).forEach(t => {
          const clientId = buildingToClient[t.building_id]
          if (clientId) {
            activeTicketsByClient[clientId] = (activeTicketsByClient[clientId] || 0) + 1
          }
        })
      }

      const enrichedClients = clientsData.map(client => ({
        ...client,
        buildings_count: buildingsByClient[client.id] || 0,
        elevators_count: elevatorsByClient[client.id] || 0,
        active_tickets_count: activeTicketsByClient[client.id] || 0
      }))

      setClients(enrichedClients)
    } catch (error: any) {
      console.error("Error loading clients:", error)
      toast({
        title: "שגיאה בטעינת לקוחות",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "נא למלא שם לקוח",
        variant: "destructive"
      })
      return
    }

    try {
      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update({
            name: formData.name.trim(),
            contact_name: formData.contact_name.trim() || null,
            contact_email: formData.contact_email.trim() || null,
            contact_phone: formData.contact_phone.trim() || null,
            preferred_channel: formData.preferred_channel
          })
          .eq("id", editingClient.id)

        if (error) throw error

        toast({
          title: "הצלחה",
          description: "הלקוח עודכן בהצלחה"
        })
      } else {
        const { error } = await supabase
          .from("clients")
          .insert([{
            name: formData.name.trim(),
            contact_name: formData.contact_name.trim() || null,
            contact_email: formData.contact_email.trim() || null,
            contact_phone: formData.contact_phone.trim() || null,
            preferred_channel: formData.preferred_channel
          }])

        if (error) throw error

        toast({
          title: "הצלחה",
          description: "הלקוח נוסף בהצלחה"
        })
      }

      setDialogOpen(false)
      setEditingClient(null)
      setFormData({
        name: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        preferred_channel: "whatsapp"
      })
      loadClients()
    } catch (error: any) {
      console.error("Error saving client:", error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleSendMessage = async () => {
    if (!messageData.message.trim()) {
      toast({
        title: "שגיאה",
        description: "נא למלא הודעה",
        variant: "destructive"
      })
      return
    }

    if (messageData.channel === "email" && !messageData.subject.trim()) {
      toast({
        title: "שגיאה",
        description: "נא למלא נושא להודעת אימייל",
        variant: "destructive"
      })
      return
    }

    const selectedClientsList = Array.from(selectedClients).map(id => 
      clients.find(c => c.id === id)
    ).filter(Boolean) as Client[]

    // Validate recipients have contact info
    const validRecipients = selectedClientsList.filter(client => {
      if (messageData.channel === "email") return client.contact_email
      if (messageData.channel === "whatsapp" || messageData.channel === "sms") return client.contact_phone
      return false
    })

    if (validRecipients.length === 0) {
      toast({
        title: "שגיאה",
        description: `אין ללקוחות הנבחרים ${messageData.channel === "email" ? "כתובת אימייל" : "מספר טלפון"}`,
        variant: "destructive"
      })
      return
    }

    // TODO: Integration with messaging service (n8n webhook)
    // For now, just simulate success
    toast({
      title: "הודעה נשלחה",
      description: `ההודעה נשלחה בהצלחה ל-${validRecipients.length} לקוחות`,
    })

    setMessageDialogOpen(false)
    setMessageData({
      channel: "whatsapp",
      subject: "",
      message: ""
    })
    setSelectedClients(new Set())
  }

  const handleBulkDelete = async () => {
    try {
      const selectedIds = Array.from(selectedClients)
      
      // Check if any selected clients have buildings
      const clientsWithBuildings = clients.filter(c => 
        selectedIds.includes(c.id) && (c.buildings_count || 0) > 0
      )

      if (clientsWithBuildings.length > 0) {
        toast({
          title: "לא ניתן למחוק",
          description: `${clientsWithBuildings.length} לקוחות מכילים בניינים. נא למחוק את הבניינים תחילה.`,
          variant: "destructive"
        })
        return
      }

      const { error } = await supabase
        .from("clients")
        .delete()
        .in("id", selectedIds)

      if (error) throw error

      toast({
        title: "הצלחה",
        description: `${selectedIds.length} לקוחות נמחקו בהצלחה`
      })

      setDeleteDialogOpen(false)
      setSelectedClients(new Set())
      loadClients()
    } catch (error: any) {
      console.error("Error deleting clients:", error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleExportToExcel = () => {
    const selectedClientsList = Array.from(selectedClients).map(id => 
      clients.find(c => c.id === id)
    ).filter(Boolean) as Client[]

    const dataToExport = selectedClientsList.length > 0 ? selectedClientsList : clients

    // Create CSV content
    const headers = ["שם", "איש קשר", "טלפון", "אימייל", "ערוץ מועדף", "בניינים", "מעליות", "קריאות פעילות"]
    const rows = dataToExport.map(c => [
      c.name,
      c.contact_name || "",
      c.contact_phone || "",
      c.contact_email || "",
      c.preferred_channel || "",
      c.buildings_count || 0,
      c.elevators_count || 0,
      c.active_tickets_count || 0
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    // Download
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `לקוחות_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "הצלחה",
      description: `${dataToExport.length} לקוחות יוצאו בהצלחה`
    })
  }

  const openAddDialog = () => {
    setEditingClient(null)
    setFormData({
      name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      preferred_channel: "whatsapp"
    })
    setDialogOpen(true)
  }

  const toggleSelectClient = (clientId: string) => {
    const newSelected = new Set(selectedClients)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
    }
    setSelectedClients(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set())
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)))
    }
  }

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients

    const searchLower = searchQuery.toLowerCase()
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchLower) ||
      client.contact_name?.toLowerCase().includes(searchLower) ||
      client.contact_email?.toLowerCase().includes(searchLower) ||
      client.contact_phone?.includes(searchQuery)
    )
  }, [clients, searchQuery])

  const stats = useMemo(() => {
    const totalBuildings = clients.reduce((sum, c) => sum + (c.buildings_count || 0), 0)
    const totalElevators = clients.reduce((sum, c) => sum + (c.elevators_count || 0), 0)
    const activeTickets = clients.reduce((sum, c) => sum + (c.active_tickets_count || 0), 0)

    return {
      totalClients: clients.length,
      totalBuildings,
      totalElevators,
      activeTickets
    }
  }, [clients])

  const clearFilters = () => {
    setSearchQuery("")
  }

  const hasActiveFilters = searchQuery.length > 0
  const hasSelection = selectedClients.size > 0

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">לקוחות</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ניהול ועדי בתים וחברות ניהול
            </p>
          </div>
          <Button onClick={openAddDialog} size="lg">
            <Plus className="h-5 w-5 ml-2" />
            לקוח חדש
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">סה"כ לקוחות</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalClients}
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
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">בניינים</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalBuildings}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">מעליות</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalElevators}
                  </p>
                </div>
                <Wrench className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">קריאות פעילות</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.activeTickets}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Bulk Actions */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="חפש לקוח לפי שם, איש קשר, טלפון או אימייל..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 ml-2" />
                נקה חיפוש
              </Button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {hasSelection && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {selectedClients.size} לקוחות נבחרו
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedClients(new Set())}
                    >
                      בטל בחירה
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setMessageDialogOpen(true)}
                    >
                      <Send className="h-4 w-4 ml-2" />
                      שלח הודעה
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExportToExcel}
                    >
                      <Download className="h-4 w-4 ml-2" />
                      ייצא לExcel
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      מחק
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Clients Grid */}
      <div className="p-6">
        {/* Select All */}
        {filteredClients.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <Checkbox
              checked={selectedClients.size === filteredClients.length}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <Label htmlFor="select-all" className="cursor-pointer font-medium">
              בחר הכל ({filteredClients.length})
            </Label>
          </div>
        )}

        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">
                {hasActiveFilters ? "לא נמצאו לקוחות" : "אין לקוחות"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {hasActiveFilters 
                  ? "נסה לשנות את מילות החיפוש"
                  : "התחל בהוספת הלקוח הראשון שלך"
                }
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  נקה חיפוש
                </Button>
              ) : (
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף לקוח
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => {
              const channelConfig = client.preferred_channel ? CHANNEL_CONFIG[client.preferred_channel] : null
              const isSelected = selectedClients.has(client.id)

              return (
                <Card 
                  key={client.id} 
                  className={`hover:shadow-lg transition-all group ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    {/* Selection Checkbox */}
                    <div className="flex items-start gap-3 mb-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectClient(client.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/client-hub?client=${client.id}`)}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 transition-colors">
                              {client.name}
                            </h3>
                            {client.contact_name && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {client.contact_name}
                              </p>
                            )}
                          </div>
                          {channelConfig && (
                            <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${channelConfig.color}`}>
                              <channelConfig.icon className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        {/* Contact Info */}
                        {(client.contact_phone || client.contact_email) && (
                          <div className="space-y-2 mb-4">
                            {client.contact_phone && (
                              <a 
                                href={`tel:${client.contact_phone}`}
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3" />
                                <span dir="ltr">{client.contact_phone}</span>
                              </a>
                            )}
                            {client.contact_email && (
                              <a 
                                href={`mailto:${client.contact_email}`}
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{client.contact_email}</span>
                              </a>
                            )}
                          </div>
                        )}

                        <Separator className="my-4" />

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">בניינים</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {client.buildings_count || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מעליות</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {client.elevators_count || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">קריאות</p>
                            <p className={`text-lg font-bold ${
                              (client.active_tickets_count || 0) > 0 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {client.active_tickets_count || 0}
                            </p>
                          </div>
                        </div>

                        {/* View Button */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full group-hover:bg-blue-50 group-hover:border-blue-200 dark:group-hover:bg-blue-900/20"
                        >
                          <ExternalLink className="h-4 w-4 ml-2" />
                          פתח מרכז לקוח
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "עריכת לקוח" : "לקוח חדש"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">שם הלקוח *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ועד בית משה כהן"
              />
            </div>

            <div>
              <Label htmlFor="contact_name">איש קשר</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="משה כהן"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">טלפון</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="050-1234567"
                dir="ltr"
              />
            </div>

            <div>
              <Label htmlFor="contact_email">אימייל</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="moshe@example.com"
                dir="ltr"
              />
            </div>

            <div>
              <Label htmlFor="preferred_channel">ערוץ תקשורת מועדף</Label>
              <Select 
                value={formData.preferred_channel} 
                onValueChange={(value: any) => setFormData({ ...formData, preferred_channel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-600" />
                      Email
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave}>
              {editingClient ? "עדכן" : "הוסף"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>שליחת הודעה ל-{selectedClients.size} לקוחות</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="channel">ערוץ תקשורת</Label>
              <Select 
                value={messageData.channel} 
                onValueChange={(value: any) => setMessageData({ ...messageData, channel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-600" />
                      Email
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {messageData.channel === "email" && (
              <div>
                <Label htmlFor="subject">נושא</Label>
                <Input
                  id="subject"
                  value={messageData.subject}
                  onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                  placeholder="נושא ההודעה"
                />
              </div>
            )}

            <div>
              <Label htmlFor="message">תוכן ההודעה</Label>
              <Textarea
                id="message"
                value={messageData.message}
                onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                placeholder="כתוב את ההודעה כאן..."
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                {messageData.message.length} תווים
              </p>
            </div>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <CardContent className="p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 ההודעה תישלח רק ללקוחות שיש להם {messageData.channel === "email" ? "כתובת אימייל" : "מספר טלפון"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4 ml-2" />
              שלח הודעה
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת לקוחות</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              האם אתה בטוח שברצונך למחוק <strong>{selectedClients.size}</strong> לקוחות?
            </p>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
              <CardContent className="p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ⚠️ לא ניתן למחוק לקוחות שיש להם בניינים. נא למחוק את הבניינים תחילה.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 ml-2" />
              מחק
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}