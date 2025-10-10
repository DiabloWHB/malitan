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
import {
  Loader2,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  Package,
  TrendingUp,
  Clock,
  DollarSign,
  Edit,
  Eye,
  ShoppingCart,
  MessageSquare,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  Upload
} from "lucide-react"

// Types
type Supplier = {
  id: string
  company_id: string
  supplier_code: string
  company_name: string
  business_id: string | null
  vat_number: string | null
  supplier_type: string
  categories: string[] | null
  primary_contact_name: string | null
  primary_contact_role: string | null
  primary_contact_phone: string | null
  primary_contact_email: string | null
  office_phone: string | null
  mobile_phone: string | null
  website: string | null
  billing_address: any
  payment_terms: string | null
  currency: string
  lead_time_days: number | null
  overall_rating: number
  total_orders: number
  total_spend: number
  preferred_supplier: boolean
  status: 'active' | 'inactive' | 'suspended' | 'blacklisted'
  notes: string | null
  created_at: string
}

type SupplierSummary = Supplier & {
  on_time_delivery_rate: number | null
  quality_rating_average: number | null
  lead_time_average: number | null
  last_order_date: string | null
  open_communications: number
}

// Config
const SUPPLIER_TYPES = {
  parts_mechanical: { label: 'חלקי חילוף מכאניים', icon: '⚙️', color: 'bg-blue-100 text-blue-800' },
  parts_electronic: { label: 'חלקי חילוף אלקטרוניים', icon: '💡', color: 'bg-purple-100 text-purple-800' },
  parts_safety: { label: 'ציוד בטיחות', icon: '🛡️', color: 'bg-green-100 text-green-800' },
  equipment: { label: 'ציוד וכלי עבודה', icon: '🔧', color: 'bg-orange-100 text-orange-800' },
  subcontractor_installation: { label: 'קבלני משנה - התקנות', icon: '🏗️', color: 'bg-yellow-100 text-yellow-800' },
  subcontractor_renovation: { label: 'קבלני משנה - שיפוצים', icon: '🎨', color: 'bg-pink-100 text-pink-800' },
  service_provider: { label: 'ספקי שירותים', icon: '🤝', color: 'bg-teal-100 text-teal-800' },
  other: { label: 'אחר', icon: '📦', color: 'bg-gray-100 text-gray-800' }
}

const STATUS_CONFIG = {
  active: { label: 'פעיל', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  inactive: { label: 'לא פעיל', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  suspended: { label: 'מושעה', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  blacklisted: { label: 'רשימה שחורה', color: 'bg-red-100 text-red-800', icon: XCircle }
}

export default function SuppliersPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active")
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const [formData, setFormData] = useState({
    company_name: "",
    supplier_type: "parts_mechanical",
    business_id: "",
    vat_number: "",
    primary_contact_name: "",
    primary_contact_role: "",
    primary_contact_phone: "",
    primary_contact_email: "",
    office_phone: "",
    website: "",
    payment_terms: "30",
    lead_time_days: "7",
    billing_address: {
      street: "",
      city: "",
      zip: "",
      country: "ישראל"
    },
    notes: "",
    preferred_supplier: false
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch from view for optimized data
      const { data, error } = await supabase
        .from('suppliers_summary')
        .select('*')
        .order('company_name', { ascending: true })

      if (error) throw error
      setSuppliers(data || [])

    } catch (error: any) {
      console.error('Error fetching suppliers:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = 
        supplier.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.supplier_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.primary_contact_name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = typeFilter === 'all' || supplier.supplier_type === typeFilter
      const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })
  }, [suppliers, searchQuery, typeFilter, statusFilter])

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter(s => s.status === 'active').length,
      preferred: suppliers.filter(s => s.preferred_supplier).length,
      totalSpend: suppliers.reduce((sum, s) => sum + s.total_spend, 0)
    }
  }, [suppliers])

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        company_name: supplier.company_name,
        supplier_type: supplier.supplier_type,
        business_id: supplier.business_id || "",
        vat_number: supplier.vat_number || "",
        primary_contact_name: supplier.primary_contact_name || "",
        primary_contact_role: supplier.primary_contact_role || "",
        primary_contact_phone: supplier.primary_contact_phone || "",
        primary_contact_email: supplier.primary_contact_email || "",
        office_phone: supplier.office_phone || "",
        website: supplier.website || "",
        payment_terms: supplier.payment_terms || "30",
        lead_time_days: supplier.lead_time_days?.toString() || "7",
        billing_address: supplier.billing_address || {
          street: "",
          city: "",
          zip: "",
          country: "ישראל"
        },
        notes: supplier.notes || "",
        preferred_supplier: supplier.preferred_supplier
      })
    } else {
      setEditingSupplier(null)
      resetForm()
    }
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      company_name: "",
      supplier_type: "parts_mechanical",
      business_id: "",
      vat_number: "",
      primary_contact_name: "",
      primary_contact_role: "",
      primary_contact_phone: "",
      primary_contact_email: "",
      office_phone: "",
      website: "",
      payment_terms: "30",
      lead_time_days: "7",
      billing_address: {
        street: "",
        city: "",
        zip: "",
        country: "ישראל"
      },
      notes: "",
      preferred_supplier: false
    })
  }

  const handleSave = async () => {
    try {
      if (!formData.company_name.trim()) {
        toast({
          title: "שגיאה",
          description: "יש להזין שם חברה",
          variant: "destructive"
        })
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

      if (editingSupplier) {
        // Update existing supplier
        const { error } = await supabase
          .from('suppliers')
          .update({
            company_name: formData.company_name.trim(),
            supplier_type: formData.supplier_type,
            business_id: formData.business_id.trim() || null,
            vat_number: formData.vat_number.trim() || null,
            primary_contact_name: formData.primary_contact_name.trim() || null,
            primary_contact_role: formData.primary_contact_role.trim() || null,
            primary_contact_phone: formData.primary_contact_phone.trim() || null,
            primary_contact_email: formData.primary_contact_email.trim() || null,
            office_phone: formData.office_phone.trim() || null,
            website: formData.website.trim() || null,
            payment_terms: formData.payment_terms,
            lead_time_days: parseInt(formData.lead_time_days) || 7,
            billing_address: formData.billing_address,
            notes: formData.notes.trim() || null,
            preferred_supplier: formData.preferred_supplier,
            updated_by: user.id
          })
          .eq('id', editingSupplier.id)

        if (error) throw error

        toast({
          title: "ספק עודכן",
          description: "הספק עודכן בהצלחה"
        })
      } else {
        // Generate supplier code
        const { data: codeData } = await supabase.rpc('generate_supplier_code', {
          p_company_id: profile.company_id
        })

        // Create new supplier
        const { error } = await supabase
          .from('suppliers')
          .insert([{
            company_id: profile.company_id,
            supplier_code: codeData || `S-${Date.now().toString().slice(-4)}`,
            company_name: formData.company_name.trim(),
            supplier_type: formData.supplier_type,
            business_id: formData.business_id.trim() || null,
            vat_number: formData.vat_number.trim() || null,
            primary_contact_name: formData.primary_contact_name.trim() || null,
            primary_contact_role: formData.primary_contact_role.trim() || null,
            primary_contact_phone: formData.primary_contact_phone.trim() || null,
            primary_contact_email: formData.primary_contact_email.trim() || null,
            office_phone: formData.office_phone.trim() || null,
            website: formData.website.trim() || null,
            payment_terms: formData.payment_terms,
            lead_time_days: parseInt(formData.lead_time_days) || 7,
            billing_address: formData.billing_address,
            notes: formData.notes.trim() || null,
            preferred_supplier: formData.preferred_supplier,
            status: 'active',
            created_by: user.id
          }])

        if (error) throw error

        toast({
          title: "ספק נוסף",
          description: "הספק נוסף בהצלחה למערכת"
        })
      }

      setDialogOpen(false)
      fetchSuppliers()
      resetForm()

    } catch (error: any) {
      console.error('Error saving supplier:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL')}`
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-200 text-yellow-400" />)
    }
    const emptyStars = 5 - stars.length
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />)
    }

    return <div className="flex items-center gap-0.5">{stars}</div>
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🏭 ספקים
              </h1>
              <p className="text-blue-100">
                ניהול ספקים, קבלנים ונותני שירותים
              </p>
            </div>
            <Button 
              onClick={() => handleOpenDialog()}
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-5 w-5 ml-2" />
              ספק חדש
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">סה"כ ספקים</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">פעילים</p>
                    <p className="text-2xl font-bold text-white">{stats.active}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">מועדפים</p>
                    <p className="text-2xl font-bold text-white">{stats.preferred}</p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">הוצאות (2025)</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(stats.totalSpend)}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="חיפוש לפי שם, קוד או איש קשר..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="סוג ספק" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסוגים</SelectItem>
                    {Object.entries(SUPPLIER_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.icon} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="active">פעילים</SelectItem>
                    <SelectItem value="inactive">לא פעילים</SelectItem>
                    <SelectItem value="suspended">מושעים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              מציג {filteredSuppliers.length} מתוך {suppliers.length} ספקים
            </p>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                כרטיסים
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                טבלה
              </Button>
            </div>
          </div>

          {/* Suppliers List */}
          {filteredSuppliers.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">לא נמצאו ספקים</p>
                  <p className="text-sm">נסה לשנות את הפילטרים או הוסף ספק חדש</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => {
                const typeConfig = SUPPLIER_TYPES[supplier.supplier_type as keyof typeof SUPPLIER_TYPES]
                const statusConfig = STATUS_CONFIG[supplier.status]
                const StatusIcon = statusConfig.icon

                return (
                  <Card 
                    key={supplier.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/suppliers/${supplier.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{typeConfig.icon}</span>
                            {supplier.preferred_supplier && (
                              <Award className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <CardTitle className="text-lg mb-1">
                            {supplier.company_name}
                          </CardTitle>
                          <p className="text-sm text-gray-500">{supplier.supplier_code}</p>
                        </div>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Badge className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>

                      {supplier.primary_contact_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{supplier.primary_contact_name}</p>
                            <p className="text-gray-600">{supplier.primary_contact_phone}</p>
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="flex items-center gap-1 text-gray-600 mb-1">
                            <ShoppingCart className="h-3 w-3" />
                            <span>הזמנות</span>
                          </div>
                          <p className="font-semibold">{supplier.total_orders}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-gray-600 mb-1">
                            <DollarSign className="h-3 w-3" />
                            <span>סה"כ</span>
                          </div>
                          <p className="font-semibold">{formatCurrency(supplier.total_spend)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-gray-600 mb-1">
                            <Clock className="h-3 w-3" />
                            <span>אספקה</span>
                          </div>
                          <p className="font-semibold">
                            {supplier.lead_time_average?.toFixed(1) || supplier.lead_time_days} ימים
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-gray-600 mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>בזמן</span>
                          </div>
                          <p className="font-semibold">
                            {supplier.on_time_delivery_rate?.toFixed(0) || '-'}%
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">דירוג כללי</p>
                          {renderStars(supplier.overall_rating)}
                        </div>
                        {supplier.open_communications > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <MessageSquare className="h-3 w-3 ml-1" />
                            {supplier.open_communications}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDialog(supplier)
                          }}
                        >
                          <Edit className="h-3 w-3 ml-1" />
                          ערוך
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/suppliers/${supplier.id}`)
                          }}
                        >
                          <Eye className="h-3 w-3 ml-1" />
                          פרטים
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'עריכת ספק' : 'הוספת ספק חדש'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>שם חברה *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="חברת מעליות אלפא"
                />
              </div>

              <div>
                <Label>סוג ספק *</Label>
                <Select 
                  value={formData.supplier_type} 
                  onValueChange={(value) => setFormData({...formData, supplier_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPLIER_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.icon} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>ח.פ. / ע.מ.</Label>
                <Input
                  value={formData.business_id}
                  onChange={(e) => setFormData({...formData, business_id: e.target.value})}
                  placeholder="514123456"
                />
              </div>

              <div>
                <Label>מס' עוסק מורשה</Label>
                <Input
                  value={formData.vat_number}
                  onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
                  placeholder="123456789"
                />
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div>
              <h3 className="font-semibold mb-3">איש קשר ראשי</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שם מלא</Label>
                  <Input
                    value={formData.primary_contact_name}
                    onChange={(e) => setFormData({...formData, primary_contact_name: e.target.value})}
                    placeholder="דני כהן"
                  />
                </div>
                <div>
                  <Label>תפקיד</Label>
                  <Input
                    value={formData.primary_contact_role}
                    onChange={(e) => setFormData({...formData, primary_contact_role: e.target.value})}
                    placeholder="מנהל מכירות"
                  />
                </div>
                <div>
                  <Label>טלפון נייד</Label>
                  <Input
                    value={formData.primary_contact_phone}
                    onChange={(e) => setFormData({...formData, primary_contact_phone: e.target.value})}
                    placeholder="054-1234567"
                  />
                </div>
                <div>
                  <Label>אימייל</Label>
                  <Input
                    type="email"
                    value={formData.primary_contact_email}
                    onChange={(e) => setFormData({...formData, primary_contact_email: e.target.value})}
                    placeholder="danny@company.com"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>טלפון משרד</Label>
                <Input
                  value={formData.office_phone}
                  onChange={(e) => setFormData({...formData, office_phone: e.target.value})}
                  placeholder="03-1234567"
                />
              </div>
              <div>
                <Label>אתר אינטרנט</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div>
              <h3 className="font-semibold mb-3">כתובת לחשבונית</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>רחוב</Label>
                  <Input
                    value={formData.billing_address.street}
                    onChange={(e) => setFormData({
                      ...formData, 
                      billing_address: {...formData.billing_address, street: e.target.value}
                    })}
                    placeholder="רחוב המלאכה 15"
                  />
                </div>
                <div>
                  <Label>עיר</Label>
                  <Input
                    value={formData.billing_address.city}
                    onChange={(e) => setFormData({
                      ...formData, 
                      billing_address: {...formData.billing_address, city: e.target.value}
                    })}
                    placeholder="תל אביב"
                  />
                </div>
                <div>
                  <Label>מיקוד</Label>
                  <Input
                    value={formData.billing_address.zip}
                    onChange={(e) => setFormData({
                      ...formData, 
                      billing_address: {...formData.billing_address, zip: e.target.value}
                    })}
                    placeholder="6123456"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment & Service Terms */}
            <div>
              <h3 className="font-semibold mb-3">תנאי תשלום ושירות</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תנאי תשלום (ימים)</Label>
                  <Select 
                    value={formData.payment_terms} 
                    onValueChange={(value) => setFormData({...formData, payment_terms: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">מזומן</SelectItem>
                      <SelectItem value="7">7 ימים</SelectItem>
                      <SelectItem value="14">14 ימים</SelectItem>
                      <SelectItem value="30">30 ימים</SelectItem>
                      <SelectItem value="45">45 ימים</SelectItem>
                      <SelectItem value="60">60 ימים</SelectItem>
                      <SelectItem value="90">90 ימים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>זמן אספקה (ימים)</Label>
                  <Input
                    type="number"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({...formData, lead_time_days: e.target.value})}
                    placeholder="7"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label>הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="הערות כלליות על הספק..."
                rows={3}
              />
            </div>

            {/* Preferred Supplier */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="preferred"
                checked={formData.preferred_supplier}
                onChange={(e) => setFormData({...formData, preferred_supplier: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="preferred" className="cursor-pointer flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                ספק מועדף
              </Label>
            </div>
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
            <Button onClick={handleSave}>
              {editingSupplier ? 'עדכן' : 'הוסף ספק'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}