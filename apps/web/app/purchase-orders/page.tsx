"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import {
  Loader2,
  Plus,
  Search,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Edit,
  Eye,
  Building2,
  User,
  Phone,
  Star,
  AlertCircle,
  Briefcase,
  MessageSquare,
  Trash2
} from "lucide-react"

// Types
type PurchaseOrder = {
  id: string
  company_id: string
  po_number: string
  supplier_id: string | null
  project_id: string | null
  order_date: string
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  status: 'pending' | 'ordered' | 'partially_received' | 'received' | 'cancelled'
  total_amount: number
  notes: string | null
  contact_person: string | null
  shipping_method: string | null
  tracking_number: string | null
  quality_rating: number | null
  delivery_rating: number | null
  created_at: string
  // Relations
  supplier?: {
    id: string
    company_name: string
    supplier_code: string
    primary_contact_name: string | null
    primary_contact_phone: string | null
    lead_time_days: number | null
    overall_rating: number
  }
  project?: {
    id: string
    name: string
    project_number: string
  }
}

type Supplier = {
  id: string
  supplier_code: string
  company_name: string
  primary_contact_name: string | null
  primary_contact_phone: string | null
  primary_contact_email: string | null
  lead_time_days: number | null
  payment_terms: string | null
  overall_rating: number
}

type Project = {
  id: string
  project_number: string
  name: string
  status: string
}

type Part = {
  id: string
  part_number: string
  name: string
  category: string
  unit_price: number | null
  quantity_in_stock: number
}

type POItem = {
  part_id: string
  quantity_ordered: number
  unit_price: number
  notes: string
}

const STATUS_CONFIG = {
  pending: { label: 'ממתין לאישור', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  ordered: { label: 'הוזמן', color: 'bg-blue-100 text-blue-800', icon: ShoppingCart },
  partially_received: { label: 'התקבל חלקית', color: 'bg-purple-100 text-purple-800', icon: Package },
  received: { label: 'התקבל', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-800', icon: XCircle }
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [parts, setParts] = useState<Part[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null)

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const [formData, setFormData] = useState({
    supplier_id: "",
    project_id: "",
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    contact_person: "",
    shipping_method: "standard",
    notes: ""
  })

  const [poItems, setPoItems] = useState<POItem[]>([{
    part_id: "",
    quantity_ordered: 1,
    unit_price: 0,
    notes: ""
  }])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Check if supplier/project was passed in URL
    const supplierParam = searchParams.get('supplier')
    const projectParam = searchParams.get('project')
    
    if (supplierParam && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === supplierParam)
      if (supplier) {
        setSelectedSupplier(supplier)
        setFormData(prev => ({ ...prev, supplier_id: supplier.id }))
        setDialogOpen(true)
      }
    }

    if (projectParam && projects.length > 0) {
      const project = projects.find(p => p.id === projectParam)
      if (project) {
        setSelectedProject(project)
        setFormData(prev => ({ ...prev, project_id: project.id }))
      }
    }
  }, [searchParams, suppliers, projects])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch purchase orders with relations
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(id, company_name, supplier_code, primary_contact_name, primary_contact_phone, lead_time_days, overall_rating),
          project:projects(id, name, project_number)
        `)
        .order('created_at', { ascending: false })

      if (poError) throw poError
      setPurchaseOrders(poData || [])

      // Fetch suppliers
      console.log('🔍 Fetching suppliers...')
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, supplier_code, company_name, primary_contact_name, primary_contact_phone, primary_contact_email, lead_time_days, payment_terms, overall_rating')
        .eq('status', 'active')
        .order('company_name', { ascending: true })

      console.log('🔍 Suppliers result:', { data: suppliersData, error: suppliersError })
      if (suppliersError) {
        console.error('❌ Suppliers error:', suppliersError)
      }

      if (suppliersError) throw suppliersError
      setSuppliers(suppliersData || [])
      console.log('🔍 SUPPLIERS DEBUG:', {
        count: suppliersData?.length,
        suppliers: suppliersData,
        error: suppliersError
      })
      console.log('Loaded suppliers:', suppliersData)
      console.log('Suppliers count:', suppliersData?.length)

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_number, name, status')
        .in('status', ['planning', 'approved', 'in_progress'])
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      // Fetch parts
      const { data: partsData, error: partsError } = await supabase
        .from('parts')
        .select('id, part_number, name, category, unit_price, quantity_in_stock')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (partsError) throw partsError
      setParts(partsData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "שגיאה בטעינת נתונים",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (po?: PurchaseOrder) => {
    if (po) {
      setEditingPO(po)
      // TODO: Load existing PO data
    } else {
      setEditingPO(null)
      resetForm()
    }
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      project_id: "",
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: "",
      contact_person: "",
      shipping_method: "standard",
      notes: ""
    })
    setPoItems([{
      part_id: "",
      quantity_ordered: 1,
      unit_price: 0,
      notes: ""
    }])
    setSelectedSupplier(null)
    setSelectedProject(null)
  }

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId)
    if (supplier) {
      setSelectedSupplier(supplier)
      setFormData(prev => ({
        ...prev,
        supplier_id: supplier.id,
        contact_person: supplier.primary_contact_name || "",
        expected_delivery_date: supplier.lead_time_days 
          ? new Date(Date.now() + supplier.lead_time_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : ""
      }))
    }
  }

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      setFormData(prev => ({ ...prev, project_id: project.id }))
    }
  }

  const addPOItem = () => {
    setPoItems([...poItems, {
      part_id: "",
      quantity_ordered: 1,
      unit_price: 0,
      notes: ""
    }])
  }

  const removePOItem = (index: number) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index))
    }
  }

  const updatePOItem = (index: number, field: keyof POItem, value: string | number) => {
    const updated = [...poItems]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-fill price from part
    if (field === 'part_id') {
      const part = parts.find(p => p.id === value)
      if (part && part.unit_price) {
        updated[index].unit_price = part.unit_price
      }
    }

    setPoItems(updated)
  }

  const calculateTotal = () => {
    return poItems.reduce((sum, item) => {
      return sum + (item.quantity_ordered * item.unit_price)
    }, 0)
  }

  const handleSave = async () => {
    try {
      // ולידציה
      if (!formData.supplier_id || formData.supplier_id === "") {
        toast({
          variant: "destructive",
          title: "❌ שגיאה",
          description: "יש לבחור ספק"
        })
        return
      }

      if (!formData.order_date) {
        toast({
          variant: "destructive",
          title: "❌ שגיאה",
          description: "יש להזין תאריך הזמנה"
        })
        return
      }

      if (poItems.length === 0) {
        toast({
          variant: "destructive",
          title: "❌ שגיאה",
          description: "יש להוסיף לפחות פריט אחד להזמנה"
        })
        return
      }

      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("משתמש לא מחובר")

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (!profile?.company_id) throw new Error("לא נמצא company_id")

      // חישוב סכום כולל
      const totalAmount = poItems.reduce((sum, item) =>
        sum + (item.quantity_ordered * item.unit_price), 0
      )

      // יצירת אובייקט ההזמנה
      const poData: Record<string, unknown> = {
        company_id: profile.company_id,
        po_number: editingPO
          ? editingPO.po_number
          : `PO-${Date.now().toString().slice(-8)}`,
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        status: 'pending',
        total_amount: totalAmount,
        notes: formData.notes || null,
        created_by: user.id
      }

      // תמיכה במצב החדש והישן
      // אם formData.supplier_id הוא UUID
      if (formData.supplier_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        poData.supplier_id = formData.supplier_id

        // מצא את שם הספק לשדה הישן
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('company_name')
          .eq('id', formData.supplier_id)
          .single()

        poData.supplier = supplierData?.company_name || 'Unknown'
      } else {
        // אם זה טקסט רגיל (מצב ישן)
        poData.supplier = formData.supplier_id
      }

      // הוסף שדות נוספים אם קיימים
      if (formData.project_id) poData.project_id = formData.project_id
      if (formData.contact_person) poData.contact_person = formData.contact_person
      if (formData.shipping_method) poData.shipping_method = formData.shipping_method

      let purchaseOrderId: string

      if (editingPO) {
        // עדכון הזמנה קיימת
        const { error: poError } = await supabase
          .from("purchase_orders")
          .update(poData)
          .eq("id", editingPO.id)

        if (poError) throw poError
        purchaseOrderId = editingPO.id

        // מחיקת פריטים ישנים
        await supabase
          .from("purchase_order_items")
          .delete()
          .eq("purchase_order_id", editingPO.id)

      } else {
        // יצירת הזמנה חדשה
        const { data: newPO, error: poError } = await supabase
          .from("purchase_orders")
          .insert(poData)
          .select()
          .single()

        if (poError) throw poError
        if (!newPO) throw new Error("Failed to create purchase order")
        purchaseOrderId = newPO.id
      }

      // הוספת פריטי ההזמנה
      const itemsToInsert = poItems.map(item => ({
        purchase_order_id: purchaseOrderId,
        part_id: item.part_id,
        quantity_ordered: item.quantity_ordered,
        quantity_received: 0,
        unit_price: item.unit_price,
        total_price: item.quantity_ordered * item.unit_price,
        notes: item.notes || null
      }))

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast({
        title: "✅ הצלחה",
        description: editingPO
          ? "הזמנת הרכש עודכנה בהצלחה"
          : "הזמנת רכש חדשה נוצרה בהצלחה"
      })

      setDialogOpen(false)
      resetForm()
      fetchData()

    } catch (error) {
      console.error("Error saving purchase order:", error)
      toast({
        variant: "destructive",
        title: "❌ שגיאה",
        description: error instanceof Error
          ? error.message
          : "נכשל בשמירת הזמנת הרכש"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePO = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) return

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "הצלחה",
        description: "ההזמנה נמחקה בהצלחה",
      })

      fetchData()
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "שגיאה במחיקת הזמנה",
        variant: "destructive"
      })
    }
  }

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesSearch = 
        po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplier?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || po.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [purchaseOrders, searchQuery, statusFilter])

  const stats = useMemo(() => {
    return {
      total: purchaseOrders.length,
      pending: purchaseOrders.filter(po => po.status === 'pending').length,
      ordered: purchaseOrders.filter(po => po.status === 'ordered').length,
      received: purchaseOrders.filter(po => po.status === 'received').length,
      totalAmount: purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0)
    }
  }, [purchaseOrders])

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL')}`
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('he-IL')
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star 
          key={i} 
          className={`h-3 w-3 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
        />
      )
    }
    return <div className="flex gap-0.5">{stars}</div>
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🛒 הזמנות רכש
              </h1>
              <p className="text-orange-100">
                ניהול הזמנות רכש מספקים
              </p>
            </div>
            <Button 
              onClick={() => handleOpenDialog()}
              size="lg"
              className="bg-white text-orange-600 hover:bg-orange-50"
            >
              <Plus className="h-5 w-5 ml-2" />
              הזמנה חדשה
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-100">סה&quot;כ הזמנות</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-100">ממתינות</p>
                    <p className="text-2xl font-bold text-white">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-100">הוזמנו</p>
                    <p className="text-2xl font-bold text-white">{stats.ordered}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-100">התקבלו</p>
                    <p className="text-2xl font-bold text-white">{stats.received}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-100">סה&quot;כ סכום</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(stats.totalAmount)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-300" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="חיפוש לפי מספר הזמנה, ספק או פרויקט..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="pending">ממתין לאישור</SelectItem>
                    <SelectItem value="ordered">הוזמן</SelectItem>
                    <SelectItem value="partially_received">התקבל חלקית</SelectItem>
                    <SelectItem value="received">התקבל</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              מציג {filteredOrders.length} מתוך {purchaseOrders.length} הזמנות
            </p>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">לא נמצאו הזמנות</p>
                  <p className="text-sm">צור הזמנת רכש חדשה או שנה את הפילטרים</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((po) => {
                const statusConfig = STATUS_CONFIG[po.status]
                const StatusIcon = statusConfig.icon

                return (
                  <Card
                    key={po.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-bold">{po.po_number}</h3>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 ml-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {/* Supplier */}
                            {po.supplier && (
                              <div>
                                <div className="flex items-center gap-1 text-gray-600 mb-1">
                                  <Building2 className="h-3 w-3" />
                                  <span>ספק</span>
                                </div>
                                <p className="font-semibold">{po.supplier.company_name}</p>
                                {po.supplier.overall_rating > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {renderStars(po.supplier.overall_rating)}
                                    <span className="text-xs text-gray-500">
                                      {po.supplier.overall_rating.toFixed(1)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Project */}
                            {po.project && (
                              <div>
                                <div className="flex items-center gap-1 text-gray-600 mb-1">
                                  <Briefcase className="h-3 w-3" />
                                  <span>פרויקט</span>
                                </div>
                                <p className="font-semibold">{po.project.name}</p>
                                <p className="text-xs text-gray-500">{po.project.project_number}</p>
                              </div>
                            )}

                            {/* Dates */}
                            <div>
                              <div className="flex items-center gap-1 text-gray-600 mb-1">
                                <Clock className="h-3 w-3" />
                                <span>תאריכים</span>
                              </div>
                              <p className="text-xs">הוזמן: {formatDate(po.order_date)}</p>
                              {po.expected_delivery_date && (
                                <p className="text-xs">צפוי: {formatDate(po.expected_delivery_date)}</p>
                              )}
                            </div>

                            {/* Contact */}
                            {po.contact_person && (
                              <div>
                                <div className="flex items-center gap-1 text-gray-600 mb-1">
                                  <User className="h-3 w-3" />
                                  <span>איש קשר</span>
                                </div>
                                <p className="font-semibold">{po.contact_person}</p>
                                {po.supplier?.primary_contact_phone && (
                                  <p className="text-xs text-gray-500">{po.supplier.primary_contact_phone}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="text-left mr-6 flex flex-col items-end gap-4">
                          <div>
                            <p className="text-3xl font-bold text-green-600">
                              {formatCurrency(po.total_amount)}
                            </p>
                            {po.tracking_number && (
                              <p className="text-xs text-gray-500 mt-2">
                                מעקב: {po.tracking_number}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/purchase-orders/${po.id}`)}
                              title="צפה בפרטים"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPO(po)
                                setDialogOpen(true)
                              }}
                              title="ערוך"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePO(po.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="מחק"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPO ? 'עריכת הזמנת רכש' : 'הזמנת רכש חדשה'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Supplier Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">בחירת ספק</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>ספק *</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={handleSupplierSelect}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="בחר ספק..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="חפש ספק..."
                          className="mb-2"
                          onChange={(e) => {
                            const search = e.target.value.toLowerCase()
                            const items = document.querySelectorAll('[role="option"]')
                            items.forEach((item: Element) => {
                              const text = item.textContent?.toLowerCase() || ''
                              const htmlItem = item as HTMLElement
                              htmlItem.style.display = text.includes(search) ? 'flex' : 'none'
                            })
                          }}
                        />
                      </div>
                      {suppliers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          אין ספקים זמינים
                        </div>
                      ) : (
                        suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium">{s.company_name}</span>
                              <span className="text-sm text-gray-500 mr-2">({s.supplier_code})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSupplier && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{selectedSupplier.company_name}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedSupplier.primary_contact_name && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-gray-600" />
                              <span>{selectedSupplier.primary_contact_name}</span>
                            </div>
                          )}
                          {selectedSupplier.primary_contact_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-600" />
                              <a href={`tel:${selectedSupplier.primary_contact_phone}`}
                                 className="text-blue-600 hover:underline"
                                 onClick={(e) => e.stopPropagation()}>
                                {selectedSupplier.primary_contact_phone}
                              </a>
                            </div>
                          )}
                          {selectedSupplier.lead_time_days && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-600" />
                              <span>זמן אספקה: {selectedSupplier.lead_time_days} ימים</span>
                            </div>
                          )}
                          {selectedSupplier.payment_terms && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-gray-600" />
                              <span>תשלום: {selectedSupplier.payment_terms} ימים</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-gray-600 mb-1">דירוג</p>
                        {renderStars(selectedSupplier.overall_rating)}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/suppliers/${selectedSupplier.id}`, '_blank')
                        }}
                      >
                        <Eye className="h-3 w-3 ml-1" />
                        צפה בספק
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/suppliers/${selectedSupplier.id}?tab=communications`, '_blank')
                        }}
                      >
                        <MessageSquare className="h-3 w-3 ml-1" />
                        תקשורת קודמת
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Selection (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">קישור לפרויקט (אופציונלי)</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>פרויקט</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={handleProjectSelect}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="בחר פרויקט (אופציונלי)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="חפש פרויקט..."
                          className="mb-2"
                          onChange={(e) => {
                            const search = e.target.value.toLowerCase()
                            const items = document.querySelectorAll('[role="option"]')
                            items.forEach((item: Element) => {
                              const text = item.textContent?.toLowerCase() || ''
                              const htmlItem = item as HTMLElement
                              htmlItem.style.display = text.includes(search) ? 'flex' : 'none'
                            })
                          }}
                        />
                      </div>
                      {projects.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          אין פרויקטים פעילים
                        </div>
                      ) : (
                        projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-sm text-gray-500 mr-2">({p.project_number})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProject && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                    <p className="font-semibold">{selectedProject.name}</p>
                    <p className="text-sm text-gray-600">{selectedProject.project_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פרטי הזמנה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>תאריך הזמנה</Label>
                    <Input
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>אספקה צפויה</Label>
                    <Input
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>איש קשר</Label>
                    <Input
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="שם איש הקשר"
                    />
                  </div>

                  <div>
                    <Label>שיטת משלוח</Label>
                    <Select 
                      value={formData.shipping_method} 
                      onValueChange={(value) => setFormData({ ...formData, shipping_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">רגיל</SelectItem>
                        <SelectItem value="express">אקספרס</SelectItem>
                        <SelectItem value="pickup">איסוף עצמי</SelectItem>
                        <SelectItem value="courier">שליח</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>הערות</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="הערות להזמנה..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">פריטים</CardTitle>
                  <Button onClick={addPOItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף פריט
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {poItems.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-5">
                        <Label>חלק</Label>
                        <Select
                          value={item.part_id}
                          onValueChange={(val) => updatePOItem(index, 'part_id', val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר חלק..." />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="חפש חלק..."
                                className="mb-2"
                                onChange={(e) => {
                                  const search = e.target.value.toLowerCase()
                                  const items = document.querySelectorAll('[role="option"]')
                                  items.forEach((item: any) => {
                                    const text = item.textContent?.toLowerCase() || ''
                                    item.style.display = text.includes(search) ? 'flex' : 'none'
                                  })
                                }}
                              />
                            </div>
                            {parts.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                אין חלקים זמינים
                              </div>
                            ) : (
                              parts.map(part => (
                                <SelectItem key={part.id} value={part.id}>
                                  <div className="flex flex-col gap-1 py-1">
                                    <span className="font-medium text-sm">{part.name}</span>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <span>קטלוגי: {part.part_number}</span>
                                      <span className={part.quantity_in_stock <= 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                                        במלאי: {part.quantity_in_stock}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label>כמות</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => updatePOItem(index, 'quantity_ordered', Number(e.target.value))}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>מחיר</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updatePOItem(index, 'unit_price', Number(e.target.value))}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>סה&quot;כ</Label>
                        <Input
                          value={formatCurrency(item.quantity_ordered * item.unit_price)}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>

                      <div className="col-span-1 flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePOItem(index)}
                          disabled={poItems.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <span className="text-lg font-semibold">סה&quot;כ להזמנה:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
            >
              ביטול
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.supplier_id || poItems.some(item => !item.part_id)}
            >
              {editingPO ? 'עדכן' : 'צור הזמנה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}