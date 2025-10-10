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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Plus,
  Search,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Archive,
  Filter,
  Download,
  Upload,
  ShoppingCart,
  Warehouse,
  Truck,
  BarChart3,
  History
} from "lucide-react"

type Part = {
  id: string
  company_id: string
  part_number: string
  name: string
  description: string | null
  category: string
  manufacturer: string | null
  unit_price: number | null
  quantity_in_stock: number
  minimum_stock_level: number
  reorder_point: number
  location: string
  supplier: string | null
  supplier_part_number: string | null
  supplier_contact: string | null
  supplier_phone: string | null
  lead_time_days: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type UsageRecord = {
  id: string
  part_id: string
  ticket_id: string | null
  technician_id: string | null
  quantity_used: number
  unit_price_at_use: number | null
  used_at: string
  ticket_number?: string
  technician_name?: string
}

const CATEGORIES = [
  { value: 'motor', label: 'מנוע', icon: '⚙️' },
  { value: 'cable', label: 'כבלים', icon: '🔌' },
  { value: 'door', label: 'דלתות', icon: '🚪' },
  { value: 'control', label: 'בקרה', icon: '🎛️' },
  { value: 'safety', label: 'בטיחות', icon: '🛡️' },
  { value: 'hydraulic', label: 'הידראולי', icon: '💧' },
  { value: 'electrical', label: 'חשמל', icon: '⚡' },
  { value: 'mechanical', label: 'מכני', icon: '🔧' },
  { value: 'other', label: 'אחר', icon: '📦' }
]

const LOCATIONS = [
  { value: 'warehouse', label: 'מחסן ראשי' },
  { value: 'van_1', label: 'ואן 1' },
  { value: 'van_2', label: 'ואן 2' },
  { value: 'van_3', label: 'ואן 3' }
]

const STOCK_STATUS = {
  out_of_stock: { label: 'אזל מהמלאי', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  critical: { label: 'קריטי', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
  low: { label: 'נמוך', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: TrendingDown },
  adequate: { label: 'תקין', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle }
}

export default function PartsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [parts, setParts] = useState<Part[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [usageDialogOpen, setUsageDialogOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([])

  const [formData, setFormData] = useState({
    part_number: "",
    name: "",
    description: "",
    category: "other" as string,
    manufacturer: "",
    unit_price: "" as string | number,
    quantity_in_stock: 0,
    minimum_stock_level: 5,
    reorder_point: 10,
    location: "warehouse",
    supplier: "",
    supplier_part_number: "",
    supplier_contact: "",
    supplier_phone: "",
    lead_time_days: "" as string | number,
    notes: ""
  })

  useEffect(() => {
    fetchParts()
  }, [])

  const fetchParts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setParts(data || [])

    } catch (error: any) {
      console.error('Error fetching parts:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (part: Part): keyof typeof STOCK_STATUS => {
    if (part.quantity_in_stock === 0) return 'out_of_stock'
    if (part.quantity_in_stock <= part.reorder_point) return 'critical'
    if (part.quantity_in_stock <= part.minimum_stock_level) return 'low'
    return 'adequate'
  }

  const filteredParts = useMemo(() => {
    let filtered = parts

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(part =>
        part.name.toLowerCase().includes(searchLower) ||
        part.part_number.toLowerCase().includes(searchLower) ||
        part.manufacturer?.toLowerCase().includes(searchLower) ||
        part.description?.toLowerCase().includes(searchLower)
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(part => part.category === categoryFilter)
    }

    if (locationFilter !== "all") {
      filtered = filtered.filter(part => part.location === locationFilter)
    }

    if (stockFilter !== "all") {
      filtered = filtered.filter(part => getStockStatus(part) === stockFilter)
    }

    return filtered
  }, [parts, searchQuery, categoryFilter, locationFilter, stockFilter])

  const stats = useMemo(() => {
    const total = parts.length
    const lowStock = parts.filter(p => getStockStatus(p) === 'low' || getStockStatus(p) === 'critical').length
    const outOfStock = parts.filter(p => getStockStatus(p) === 'out_of_stock').length
    const totalValue = parts.reduce((sum, p) => sum + (p.quantity_in_stock * (p.unit_price || 0)), 0)

    return { total, lowStock, outOfStock, totalValue }
  }, [parts])

  const openAddDialog = () => {
    setEditingPart(null)
    setFormData({
      part_number: "",
      name: "",
      description: "",
      category: "other",
      manufacturer: "",
      unit_price: "",
      quantity_in_stock: 0,
      minimum_stock_level: 5,
      reorder_point: 10,
      location: "warehouse",
      supplier: "",
      supplier_part_number: "",
      supplier_contact: "",
      supplier_phone: "",
      lead_time_days: "",
      notes: ""
    })
    setDialogOpen(true)
  }

  const openEditDialog = (part: Part) => {
    setEditingPart(part)
    setFormData({
      part_number: part.part_number,
      name: part.name,
      description: part.description || "",
      category: part.category,
      manufacturer: part.manufacturer || "",
      unit_price: part.unit_price || "",
      quantity_in_stock: part.quantity_in_stock,
      minimum_stock_level: part.minimum_stock_level,
      reorder_point: part.reorder_point,
      location: part.location,
      supplier: part.supplier || "",
      supplier_part_number: part.supplier_part_number || "",
      supplier_contact: part.supplier_contact || "",
      supplier_phone: part.supplier_phone || "",
      lead_time_days: part.lead_time_days || "",
      notes: part.notes || ""
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) throw new Error("Company not found")

      const partData = {
        part_number: formData.part_number.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        manufacturer: formData.manufacturer.trim() || null,
        unit_price: formData.unit_price ? Number(formData.unit_price) : null,
        quantity_in_stock: Number(formData.quantity_in_stock),
        minimum_stock_level: Number(formData.minimum_stock_level),
        reorder_point: Number(formData.reorder_point),
        location: formData.location,
        supplier: formData.supplier.trim() || null,
        supplier_part_number: formData.supplier_part_number.trim() || null,
        supplier_contact: formData.supplier_contact.trim() || null,
        supplier_phone: formData.supplier_phone.trim() || null,
        lead_time_days: formData.lead_time_days ? Number(formData.lead_time_days) : null,
        notes: formData.notes.trim() || null,
        is_active: true
      }

      if (editingPart) {
        const { error } = await supabase
          .from('parts')
          .update(partData)
          .eq('id', editingPart.id)

        if (error) throw error

        toast({
          title: "✅ החלק עודכן בהצלחה",
          description: `${partData.name} עודכן במערכת`
        })
      } else {
        const { error } = await supabase
          .from('parts')
          .insert([{ ...partData, company_id: profile.company_id, created_by: user.id }])

        if (error) throw error

        toast({
          title: "✅ החלק נוסף בהצלחה",
          description: `${partData.name} נוסף למלאי`
        })
      }

      setDialogOpen(false)
      fetchParts()

    } catch (error: any) {
      console.error('Error saving part:', error)
      toast({
        title: "שגיאה בשמירה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (part: Part) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${part.name}?`)) return

    try {
      const { error } = await supabase
        .from('parts')
        .update({ is_active: false })
        .eq('id', part.id)

      if (error) throw error

      toast({
        title: "✅ החלק הוסר",
        description: `${part.name} הוסר מהמלאי הפעיל`
      })

      fetchParts()

    } catch (error: any) {
      console.error('Error deleting part:', error)
      toast({
        title: "שגיאה במחיקה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const openUsageDialog = async (part: Part) => {
    setSelectedPart(part)
    setUsageDialogOpen(true)
    
    try {
      const { data, error } = await supabase
        .from('parts_usage')
        .select(`
          *,
          tickets (ticket_number),
          technicians (full_name)
        `)
        .eq('part_id', part.id)
        .order('used_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const formattedUsage = data?.map(u => ({
        id: u.id,
        part_id: u.part_id,
        ticket_id: u.ticket_id,
        technician_id: u.technician_id,
        quantity_used: u.quantity_used,
        unit_price_at_use: u.unit_price_at_use,
        used_at: u.used_at,
        ticket_number: u.tickets?.ticket_number,
        technician_name: u.technicians?.full_name
      })) || []

      setUsageHistory(formattedUsage)

    } catch (error: any) {
      console.error('Error fetching usage history:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'לא צוין'
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getCategoryIcon = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.icon || '📦'
  }

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category
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
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              חלקי חילוף ומלאי
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ניהול מלאי חלקים ומעקב שימוש
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 ml-2" />
              ייצוא
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 ml-2" />
              חלק חדש
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">סה"כ פריטים</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.total}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">מלאי נמוך</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.lowStock}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">אזל מהמלאי</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.outOfStock}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">שווי מלאי</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalValue)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800 border-b">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש לפי שם, מק״ט, יצרן..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="כל הקטגוריות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="כל המיקומים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המיקומים</SelectItem>
              {LOCATIONS.map(loc => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger>
              <SelectValue placeholder="מצב מלאי" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המצבים</SelectItem>
              <SelectItem value="out_of_stock">אזל מהמלאי</SelectItem>
              <SelectItem value="critical">קריטי</SelectItem>
              <SelectItem value="low">נמוך</SelectItem>
              <SelectItem value="adequate">תקין</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Parts Grid */}
      <div className="p-6">
        {filteredParts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-xl font-semibold text-gray-900 mb-2">
                לא נמצאו חלקים
              </p>
              <p className="text-gray-600 mb-4">
                {searchQuery || categoryFilter !== "all" || locationFilter !== "all" || stockFilter !== "all"
                  ? "נסה לשנות את הפילטרים"
                  : "התחל להוסיף חלקי חילוף למלאי"}
              </p>
              {!searchQuery && categoryFilter === "all" && locationFilter === "all" && stockFilter === "all" && (
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף חלק ראשון
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredParts.map(part => {
              const stockStatus = getStockStatus(part)
              const StatusIcon = STOCK_STATUS[stockStatus].icon

              return (
                <Card key={part.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(part.category)}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{part.name}</p>
                          <p className="text-xs text-gray-500">{part.part_number}</p>
                        </div>
                      </div>
                      <Badge className={`${STOCK_STATUS[stockStatus].color} border text-xs`}>
                        <StatusIcon className="h-3 w-3 ml-1" />
                        {STOCK_STATUS[stockStatus].label}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">כמות במלאי:</span>
                        <span className="font-semibold text-gray-900">
                          {part.quantity_in_stock}
                        </span>
                      </div>

                      {part.manufacturer && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">יצרן:</span>
                          <span className="text-gray-900">{part.manufacturer}</span>
                        </div>
                      )}

                      {part.unit_price && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">מחיר:</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(part.unit_price)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">מיקום:</span>
                        <Badge variant="outline" className="text-xs">
                          {LOCATIONS.find(l => l.value === part.location)?.label}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openUsageDialog(part)}
                        className="flex-1"
                      >
                        <History className="h-3 w-3 ml-1" />
                        היסטוריה
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(part)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(part)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPart ? `עריכת ${editingPart.name}` : "הוספת חלק חדש"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part_number">מק״ט *</Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  placeholder="PN-12345"
                />
              </div>

              <div>
                <Label htmlFor="name">שם החלק *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="מנוע 10HP"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="תיאור מפורט של החלק..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">קטגוריה *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="manufacturer">יצרן</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Otis, Schindler..."
                />
              </div>
            </div>

            <Separator />

            {/* Inventory */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity_in_stock">כמות במלאי *</Label>
                <Input
                  id="quantity_in_stock"
                  type="number"
                  min="0"
                  value={formData.quantity_in_stock}
                  onChange={(e) => setFormData({ ...formData, quantity_in_stock: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="minimum_stock_level">מלאי מינימום</Label>
                <Input
                  id="minimum_stock_level"
                  type="number"
                  min="0"
                  value={formData.minimum_stock_level}
                  onChange={(e) => setFormData({ ...formData, minimum_stock_level: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="reorder_point">נקודת הזמנה</Label>
                <Input
                  id="reorder_point"
                  type="number"
                  min="0"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_price">מחיר ליחידה (₪)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="location">מיקום</Label>
                <Select
                  value={formData.location}
                  onValueChange={(val) => setFormData({ ...formData, location: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(loc => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Supplier Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">ספק</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="שם הספק"
                />
              </div>

              <div>
                <Label htmlFor="supplier_part_number">מק״ט ספק</Label>
                <Input
                  id="supplier_part_number"
                  value={formData.supplier_part_number}
                  onChange={(e) => setFormData({ ...formData, supplier_part_number: e.target.value })}
                  placeholder="מק״ט בקטלוג הספק"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="supplier_contact">איש קשר</Label>
                <Input
                  id="supplier_contact"
                  value={formData.supplier_contact}
                  onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                  placeholder="שם איש הקשר"
                />
              </div>

              <div>
                <Label htmlFor="supplier_phone">טלפון ספק</Label>
                <Input
                  id="supplier_phone"
                  value={formData.supplier_phone}
                  onChange={(e) => setFormData({ ...formData, supplier_phone: e.target.value })}
                  placeholder="050-1234567"
                  dir="ltr"
                />
              </div>

              <div>
                <Label htmlFor="lead_time_days">זמן אספקה (ימים)</Label>
                <Input
                  id="lead_time_days"
                  type="number"
                  min="0"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                  placeholder="7"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="הערות נוספות..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave}>
              {editingPart ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage History Dialog */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              היסטוריית שימוש - {selectedPart?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {usageHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>אין היסטוריית שימוש</p>
              </div>
            ) : (
              usageHistory.map(usage => (
                <div key={usage.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        כמות: {usage.quantity_used}
                      </p>
                      {usage.ticket_number && (
                        <p className="text-sm text-gray-600">
                          קריאה: {usage.ticket_number}
                        </p>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-600">
                        {formatDate(usage.used_at)}
                      </p>
                      {usage.technician_name && (
                        <p className="text-sm text-gray-600">
                          {usage.technician_name}
                        </p>
                      )}
                    </div>
                  </div>
                  {usage.unit_price_at_use && (
                    <p className="text-sm text-gray-600">
                      מחיר: {formatCurrency(usage.unit_price_at_use)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}