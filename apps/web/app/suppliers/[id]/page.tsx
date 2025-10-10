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
  Phone,
  Mail,
  Globe,
  MapPin,
  Building2,
  User,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Plus,
  FileText,
  MessageSquare,
  Video,
  Paperclip,
  Send,
  Eye,
  Download,
  Award,
  Target,
  BarChart3,
  Activity
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
  status: string
  notes: string | null
  created_at: string
}

type Communication = {
  id: string
  supplier_id: string
  type: string
  direction: string
  subject: string
  content: string | null
  from_contact: string | null
  to_contact: string | null
  category: string
  priority: string
  status: string
  created_at: string
  created_by: string
  related_po_id: string | null
  attachments: any
}

type PurchaseOrder = {
  id: string
  po_number: string
  order_date: string
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  status: string
  total_amount: number
  quality_rating: number | null
  delivery_rating: number | null
}

type PerformanceMetrics = {
  period_year: number
  period_quarter: number
  on_time_delivery_rate: number | null
  order_fulfillment_rate: number | null
  lead_time_average: number | null
  quality_rating_average: number | null
  defect_rate: number | null
  return_rate: number | null
  total_orders: number
  total_spend: number
  overall_score: number | null
}

const COMM_TYPES = {
  email: { label: 'אימייל', icon: Mail, color: 'bg-blue-100 text-blue-800' },
  phone: { label: 'טלפון', icon: Phone, color: 'bg-green-100 text-green-800' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
  meeting: { label: 'פגישה', icon: User, color: 'bg-purple-100 text-purple-800' },
  video_call: { label: 'שיחת וידאו', icon: Video, color: 'bg-purple-100 text-purple-800' },
  note: { label: 'הערה', icon: FileText, color: 'bg-gray-100 text-gray-800' }
}

const COMM_CATEGORIES = {
  quote_request: { label: 'בקשת הצעת מחיר', icon: FileText },
  order: { label: 'הזמנה', icon: ShoppingCart },
  delivery: { label: 'משלוח', icon: Package },
  complaint: { label: 'תלונה', icon: AlertCircle },
  payment: { label: 'תשלום', icon: DollarSign },
  contract: { label: 'חוזה', icon: FileText },
  general: { label: 'כללי', icon: MessageSquare },
  technical: { label: 'טכני', icon: Activity }
}

const PO_STATUS = {
  pending: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-800' },
  ordered: { label: 'הוזמן', color: 'bg-blue-100 text-blue-800' },
  partially_received: { label: 'התקבל חלקית', color: 'bg-purple-100 text-purple-800' },
  received: { label: 'התקבל', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-800' }
}

export default function SupplierDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [communications, setCommunications] = useState<Communication[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([])

  const [commDialogOpen, setCommDialogOpen] = useState(false)
  const [commFormData, setCommFormData] = useState({
    type: 'email',
    direction: 'outbound',
    subject: '',
    content: '',
    category: 'general',
    priority: 'medium'
  })

  useEffect(() => {
    if (params.id) {
      fetchSupplierData()
    }
  }, [params.id])

  const fetchSupplierData = async () => {
    try {
      setLoading(true)

      // Fetch supplier
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', params.id)
        .single()

      if (supplierError) throw supplierError
      setSupplier(supplierData)

      // Fetch communications
      const { data: commsData, error: commsError } = await supabase
        .from('supplier_communications')
        .select('*')
        .eq('supplier_id', params.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (commsError) throw commsError
      setCommunications(commsData || [])

      // Fetch purchase orders
      const { data: posData, error: posError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, order_date, expected_delivery_date, actual_delivery_date, status, total_amount, quality_rating, delivery_rating')
        .eq('supplier_id', params.id)
        .order('order_date', { ascending: false })
        .limit(50)

      if (posError) throw posError
      setPurchaseOrders(posData || [])

      // Fetch performance metrics (last 4 quarters)
      const { data: metricsData, error: metricsError } = await supabase
        .from('supplier_performance_metrics')
        .select('*')
        .eq('supplier_id', params.id)
        .order('period_year', { ascending: false })
        .order('period_quarter', { ascending: false })
        .limit(4)

      if (metricsError) throw metricsError
      setPerformanceMetrics(metricsData || [])

    } catch (error: any) {
      console.error('Error fetching supplier data:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCommunication = async () => {
    try {
      if (!commFormData.subject.trim()) {
        toast({
          title: "שגיאה",
          description: "יש להזין נושא",
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

      const { error } = await supabase
        .from('supplier_communications')
        .insert([{
          supplier_id: params.id,
          company_id: profile.company_id,
          type: commFormData.type,
          direction: commFormData.direction,
          subject: commFormData.subject.trim(),
          content: commFormData.content.trim() || null,
          category: commFormData.category,
          priority: commFormData.priority,
          status: 'open',
          created_by: user.id
        }])

      if (error) throw error

      toast({
        title: "תקשורת נוספה",
        description: "התקשורת נוספה בהצלחה"
      })

      setCommDialogOpen(false)
      setCommFormData({
        type: 'email',
        direction: 'outbound',
        subject: '',
        content: '',
        category: 'general',
        priority: 'medium'
      })
      fetchSupplierData()

    } catch (error: any) {
      console.error('Error adding communication:', error)
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

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('he-IL')
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('he-IL')
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-sm text-gray-400">לא דורג</span>
    
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

  const getCurrentQuarterMetrics = () => {
    if (performanceMetrics.length === 0) return null
    return performanceMetrics[0]
  }

  if (loading || !supplier) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  const currentMetrics = getCurrentQuarterMetrics()

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/suppliers')}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה לספקים
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="h-10 w-10 text-white" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-white">
                      {supplier.company_name}
                    </h1>
                    {supplier.preferred_supplier && (
                      <Award className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                    )}
                  </div>
                  <p className="text-blue-100">{supplier.supplier_code}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className="bg-white/20 text-white border-white/30">
                  {supplier.supplier_type.replace('_', ' ')}
                </Badge>
                {supplier.status === 'active' && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 ml-1" />
                    פעיל
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}
              >
                <Edit className="h-4 w-4 ml-2" />
                ערוך
              </Button>
              <Button
                onClick={() => router.push(`/purchase-orders/new?supplier=${supplier.id}`)}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <ShoppingCart className="h-4 w-4 ml-2" />
                הזמנה חדשה
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">דירוג כללי</p>
              <div className="flex justify-center">
                {renderStars(supplier.overall_rating)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{supplier.overall_rating.toFixed(1)}/5.0</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">הזמנות</p>
              <p className="text-2xl font-bold text-blue-600">{supplier.total_orders}</p>
              <p className="text-xs text-gray-500 mt-1">כל הזמנים</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">הוצאות</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(supplier.total_spend)}
              </p>
              <p className="text-xs text-gray-500 mt-1">כל הזמנים</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">זמן אספקה</p>
              <p className="text-2xl font-bold text-orange-600">
                {currentMetrics?.lead_time_average?.toFixed(1) || supplier.lead_time_days || '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">ימים ממוצע</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">משלוחים בזמן</p>
              <p className="text-2xl font-bold text-purple-600">
                {currentMetrics?.on_time_delivery_rate?.toFixed(0) || '-'}%
              </p>
              <p className="text-xs text-gray-500 mt-1">רבעון נוכחי</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="overview" className="space-y-6" dir="rtl">
            <TabsList className="bg-white border shadow-sm grid grid-cols-4 w-full">
              <TabsTrigger value="overview" className="gap-2">
                <FileText className="h-4 w-4" />
                סקירה
              </TabsTrigger>
              <TabsTrigger value="communications" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                תקשורת ({communications.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                הזמנות ({purchaseOrders.length})
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                ביצועים
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Info */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      פרטי קשר
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {supplier.primary_contact_name && (
                      <div>
                        <Label className="text-gray-600">איש קשר ראשי</Label>
                        <div className="mt-2 space-y-2">
                          <p className="font-semibold text-lg">{supplier.primary_contact_name}</p>
                          {supplier.primary_contact_role && (
                            <p className="text-sm text-gray-600">{supplier.primary_contact_role}</p>
                          )}
                          <div className="flex flex-col gap-2 mt-3">
                            {supplier.primary_contact_phone && (
                              <a 
                                href={`tel:${supplier.primary_contact_phone}`}
                                className="flex items-center gap-2 text-blue-600 hover:underline"
                              >
                                <Phone className="h-4 w-4" />
                                {supplier.primary_contact_phone}
                              </a>
                            )}
                            {supplier.primary_contact_email && (
                              <a 
                                href={`mailto:${supplier.primary_contact_email}`}
                                className="flex items-center gap-2 text-blue-600 hover:underline"
                              >
                                <Mail className="h-4 w-4" />
                                {supplier.primary_contact_email}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      {supplier.office_phone && (
                        <div>
                          <Label className="text-gray-600">טלפון משרד</Label>
                          <a 
                            href={`tel:${supplier.office_phone}`}
                            className="flex items-center gap-2 text-blue-600 hover:underline mt-1"
                          >
                            <Phone className="h-4 w-4" />
                            {supplier.office_phone}
                          </a>
                        </div>
                      )}
                      {supplier.website && (
                        <div>
                          <Label className="text-gray-600">אתר אינטרנט</Label>
                          <a 
                            href={supplier.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline mt-1"
                          >
                            <Globe className="h-4 w-4" />
                            בקר באתר
                          </a>
                        </div>
                      )}
                    </div>

                    {supplier.billing_address && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-gray-600 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            כתובת
                          </Label>
                          <p className="mt-2">
                            {supplier.billing_address.street && `${supplier.billing_address.street}, `}
                            {supplier.billing_address.city}
                            {supplier.billing_address.zip && `, ${supplier.billing_address.zip}`}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Business Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      פרטים עסקיים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {supplier.business_id && (
                      <div>
                        <Label className="text-gray-600">ח.פ. / ע.מ.</Label>
                        <p className="font-medium mt-1">{supplier.business_id}</p>
                      </div>
                    )}
                    {supplier.vat_number && (
                      <div>
                        <Label className="text-gray-600">מס' עוסק</Label>
                        <p className="font-medium mt-1">{supplier.vat_number}</p>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <Label className="text-gray-600">תנאי תשלום</Label>
                      <p className="font-medium mt-1">{supplier.payment_terms} ימים</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">זמן אספקה</Label>
                      <p className="font-medium mt-1">{supplier.lead_time_days} ימים</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">מטבע</Label>
                      <p className="font-medium mt-1">{supplier.currency}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {supplier.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>הערות</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{supplier.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Communications Tab */}
            <TabsContent value="communications">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                      היסטוריית תקשורת
                    </CardTitle>
                    <Button onClick={() => setCommDialogOpen(true)}>
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף תקשורת
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {communications.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="mb-2">לא נרשמה תקשורת</p>
                      <p className="text-sm">תעד שיחות, אימיילים ופגישות עם הספק</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {communications.map((comm) => {
                        const typeConfig = COMM_TYPES[comm.type as keyof typeof COMM_TYPES]
                        const categoryConfig = COMM_CATEGORIES[comm.category as keyof typeof COMM_CATEGORIES]
                        const TypeIcon = typeConfig.icon
                        const CategoryIcon = categoryConfig.icon

                        return (
                          <div key={comm.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${typeConfig.color} shrink-0`}>
                                <TypeIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">{comm.subject}</h4>
                                  <span className="text-sm text-gray-500 whitespace-nowrap">
                                    {formatDateTime(comm.created_at)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    <CategoryIcon className="h-3 w-3 ml-1" />
                                    {categoryConfig.label}
                                  </Badge>
                                  <Badge 
                                    variant="outline"
                                    className={`text-xs ${
                                      comm.direction === 'outbound' 
                                        ? 'border-blue-300 text-blue-700' 
                                        : 'border-green-300 text-green-700'
                                    }`}
                                  >
                                    {comm.direction === 'outbound' ? '→ יוצא' : '← נכנס'}
                                  </Badge>
                                  {comm.priority === 'high' && (
                                    <Badge variant="destructive" className="text-xs">
                                      עדיפות גבוהה
                                    </Badge>
                                  )}
                                </div>
                                {comm.content && (
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                    {comm.content}
                                  </p>
                                )}
                                {comm.from_contact && (
                                  <p className="text-xs text-gray-500">
                                    מאת: {comm.from_contact}
                                  </p>
                                )}
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

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-orange-600" />
                    הזמנות רכש
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {purchaseOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>טרם בוצעו הזמנות מספק זה</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {purchaseOrders.map((po) => {
                        const statusConfig = PO_STATUS[po.status as keyof typeof PO_STATUS]
                        const isLate = po.expected_delivery_date && 
                          po.status !== 'received' && 
                          new Date(po.expected_delivery_date) < new Date()

                        return (
                          <div
                            key={po.id}
                            className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/purchase-orders/${po.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{po.po_number}</h4>
                                  <Badge className={statusConfig.color}>
                                    {statusConfig.label}
                                  </Badge>
                                  {isLate && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertCircle className="h-3 w-3 ml-1" />
                                      באיחור
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">הוזמן: </span>
                                    <span className="font-medium">{formatDate(po.order_date)}</span>
                                  </div>
                                  {po.expected_delivery_date && (
                                    <div>
                                      <span className="text-gray-600">אספקה צפויה: </span>
                                      <span className="font-medium">{formatDate(po.expected_delivery_date)}</span>
                                    </div>
                                  )}
                                  {po.actual_delivery_date && (
                                    <div>
                                      <span className="text-gray-600">נתקבל: </span>
                                      <span className="font-medium text-green-600">
                                        {formatDate(po.actual_delivery_date)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="text-2xl font-bold text-green-600">
                                  {formatCurrency(po.total_amount)}
                                </p>
                                {(po.quality_rating || po.delivery_rating) && (
                                  <div className="mt-2 space-y-1">
                                    {po.quality_rating && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <span className="text-gray-600">איכות:</span>
                                        {renderStars(po.quality_rating)}
                                      </div>
                                    )}
                                    {po.delivery_rating && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <span className="text-gray-600">משלוח:</span>
                                        {renderStars(po.delivery_rating)}
                                      </div>
                                    )}
                                  </div>
                                )}
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

            {/* Performance Tab */}
            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    כרטיס ביצועים (Scorecard)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!currentMetrics ? (
                    <div className="text-center py-12 text-gray-500">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>אין מספיק נתונים לחישוב ביצועים</p>
                      <p className="text-sm mt-2">בצע הזמנות כדי לראות מדדי ביצועים</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Current Quarter Overview */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">
                            רבעון {currentMetrics.period_quarter} / {currentMetrics.period_year}
                          </h3>
                          <Badge className="bg-blue-600 text-white">
                            רבעון נוכחי
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">הזמנות</p>
                            <p className="text-2xl font-bold">{currentMetrics.total_orders}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">הוצאות</p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(currentMetrics.total_spend)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">ציון כללי</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {currentMetrics.overall_score?.toFixed(1) || '-'}/5
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Delivery Performance */}
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-600" />
                          זמינות ואמינות
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">משלוחים בזמן</span>
                              <span className="font-semibold">
                                {currentMetrics.on_time_delivery_rate?.toFixed(0) || 0}%
                              </span>
                            </div>
                            <Progress value={currentMetrics.on_time_delivery_rate || 0} className="h-2" />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">הזמנות שהתקבלו מלא</span>
                              <span className="font-semibold">
                                {currentMetrics.order_fulfillment_rate?.toFixed(0) || 0}%
                              </span>
                            </div>
                            <Progress value={currentMetrics.order_fulfillment_rate || 0} className="h-2" />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">זמן אספקה ממוצע</span>
                            <span className="font-semibold">
                              {currentMetrics.lead_time_average?.toFixed(1) || '-'} ימים
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Quality Performance */}
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          איכות
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">דירוג איכות ממוצע</span>
                              <div className="flex items-center gap-2">
                                {renderStars(currentMetrics.quality_rating_average)}
                                <span className="font-semibold">
                                  {currentMetrics.quality_rating_average?.toFixed(1) || '-'}/5
                                </span>
                              </div>
                            </div>
                            <Progress value={(currentMetrics.quality_rating_average || 0) * 20} className="h-2" />
                          </div>

                          {currentMetrics.defect_rate !== null && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">שיעור פגמים</span>
                                <span className="font-semibold text-red-600">
                                  {currentMetrics.defect_rate.toFixed(1)}%
                                </span>
                              </div>
                              <Progress 
                                value={Math.min(currentMetrics.defect_rate, 100)} 
                                className="h-2"
                              />
                            </div>
                          )}

                          {currentMetrics.return_rate !== null && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">שיעור החזרות</span>
                                <span className="font-semibold text-red-600">
                                  {currentMetrics.return_rate.toFixed(1)}%
                                </span>
                              </div>
                              <Progress 
                                value={Math.min(currentMetrics.return_rate, 100)} 
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {performanceMetrics.length > 1 && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-semibold mb-4">מגמות היסטוריות</h3>
                            <div className="space-y-2">
                              {performanceMetrics.slice(0, 4).map((metric) => (
                                <div 
                                  key={`${metric.period_year}-${metric.period_quarter}`}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                                >
                                  <span className="text-sm font-medium">
                                    Q{metric.period_quarter}/{metric.period_year}
                                  </span>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-600">
                                      {metric.total_orders} הזמנות
                                    </span>
                                    <span className="text-gray-600">
                                      {metric.on_time_delivery_rate?.toFixed(0) || '-'}% בזמן
                                    </span>
                                    <span className="font-semibold text-blue-600">
                                      {metric.overall_score?.toFixed(1) || '-'}/5
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Communication Dialog */}
      <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוסף תקשורת חדשה</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג תקשורת *</Label>
                <Select 
                  value={commFormData.type} 
                  onValueChange={(value) => setCommFormData({...commFormData, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMM_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>כיוון *</Label>
                <Select 
                  value={commFormData.direction} 
                  onValueChange={(value) => setCommFormData({...commFormData, direction: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">יוצא (מאיתנו לספק)</SelectItem>
                    <SelectItem value="inbound">נכנס (מהספק אלינו)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>קטגוריה *</Label>
                <Select 
                  value={commFormData.category} 
                  onValueChange={(value) => setCommFormData({...commFormData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMM_CATEGORIES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>עדיפות</Label>
                <Select 
                  value={commFormData.priority} 
                  onValueChange={(value) => setCommFormData({...commFormData, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="urgent">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>נושא *</Label>
              <Input
                value={commFormData.subject}
                onChange={(e) => setCommFormData({...commFormData, subject: e.target.value})}
                placeholder="לדוגמה: בקשת הצעת מחיר למנוע MRL"
              />
            </div>

            <div>
              <Label>תוכן / סיכום</Label>
              <Textarea
                value={commFormData.content}
                onChange={(e) => setCommFormData({...commFormData, content: e.target.value})}
                placeholder="תאר את התקשורת, המסרים העיקריים, החלטות שהתקבלו..."
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCommDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleAddCommunication} disabled={!commFormData.subject.trim()}>
              <Send className="h-4 w-4 ml-2" />
              הוסף תקשורת
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}