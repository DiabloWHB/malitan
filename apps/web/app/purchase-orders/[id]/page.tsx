"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  ArrowRight,
  ShoppingCart,
  Calendar,
  Package,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2
} from "lucide-react"
import { POPDFActions } from "@/components/ui/purchase-orders/POPDFActions"
import { POTimeline } from "@/components/ui/purchase-orders/POTimeline"

type PurchaseOrder = {
  id: string
  company_id: string
  po_number: string
  supplier: string | {
    company_name: string
    supplier_code: string
    primary_contact_name?: string
    primary_contact_phone?: string
    primary_contact_email?: string
  } | null
  order_date: string
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  status: 'pending' | 'ordered' | 'partially_received' | 'received' | 'cancelled'
  total_amount: number
  notes: string | null
  created_at: string
  created_by: string
}

type POItem = {
  id: string
  purchase_order_id: string
  part_id: string
  quantity_ordered: number
  quantity_received: number
  unit_price: number
  total_price: number
  notes: string | null
  part: {
    name: string
    part_number: string
    category: string
  }
}

const STATUS_CONFIG = {
  pending: {
    label: 'ממתין לאישור',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    badgeVariant: 'warning' as const
  },
  ordered: {
    label: 'הוזמן',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: ShoppingCart,
    badgeVariant: 'default' as const
  },
  partially_received: {
    label: 'התקבל חלקית',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Package,
    badgeVariant: 'secondary' as const
  },
  received: {
    label: 'התקבל',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    badgeVariant: 'default' as const
  },
  cancelled: {
    label: 'בוטל',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle,
    badgeVariant: 'outline' as const
  }
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const poId = params.id as string

  const [loading, setLoading] = useState(true)
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [items, setItems] = useState<POItem[]>([])

  useEffect(() => {
    if (poId) {
      fetchPurchaseOrder()
    }
  }, [poId])

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true)

      // טעינת הזמנת רכש + פרטי ספק
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers (
          id,
          company_name,
          supplier_code,
          primary_contact_email,
          primary_contact_phone,
          primary_contact_name,
          billing_address
        )
      `)
      .eq('id', poId)
      .single()

      if (poError) throw poError
      if (!poData) {
        toast({
          variant: "destructive",
          title: "❌ לא נמצא",
          description: "הזמנת רכש לא נמצאה"
        })
        router.push('/purchase-orders')
        return
      }

      setPurchaseOrder(poData)

      // טעינת פריטי ההזמנה
      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          part:parts (
            name,
            part_number,
            category
          )
        `)
        .eq('purchase_order_id', poId)

      if (itemsError) throw itemsError
      setItems(itemsData || [])

    } catch (error) {
      console.error('Error fetching purchase order:', error)
      toast({
        variant: "destructive",
        title: "❌ שגיאה",
        description: "נכשל בטעינת נתונים"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (!purchaseOrder) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            הזמנה לא נמצאה
          </h2>
          <Button onClick={() => router.push('/purchase-orders')}>
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה להזמנות רכש
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[purchaseOrder.status]
  const StatusIcon = statusConfig.icon

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/purchase-orders')}
              className="mb-2"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה להזמנות רכש
            </Button>
            
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                הזמנת רכש {purchaseOrder.po_number}
              </h1>
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 ml-1" />
                {statusConfig.label}
              </Badge>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ספק: {typeof purchaseOrder.supplier === 'object' && purchaseOrder.supplier?.company_name
                ? purchaseOrder.supplier.company_name
                : typeof purchaseOrder.supplier === 'string'
                  ? purchaseOrder.supplier
                  : 'לא צוין'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/purchase-orders/edit/${poId}`)}
            >
              <Edit className="h-4 w-4 ml-2" />
              ערוך
            </Button>
          </div>
        </div>

        {/* כפתורי PDF */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              פעולות PDF ושליחה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <POPDFActions purchaseOrder={purchaseOrder} items={items} />
          </CardContent>
        </Card>

        {/* Grid של פרטים */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* פרטי הזמנה */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                פרטי ההזמנה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    מספר הזמנה
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {purchaseOrder.po_number}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    ספק
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {purchaseOrder.supplier?.company_name || 'לא צוין'}
                  </p>
                  {purchaseOrder.supplier?.supplier_code && (
                    <p className="text-xs text-gray-500 mt-1">
                      קוד: {purchaseOrder.supplier.supplier_code}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    תאריך הזמנה
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(purchaseOrder.order_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    תאריך אספקה צפוי
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {purchaseOrder.expected_delivery_date 
                      ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString('he-IL')
                      : 'לא צוין'}
                  </p>
                </div>
              </div>

              {purchaseOrder.actual_delivery_date && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      תאריך אספקה בפועל
                    </p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {new Date(purchaseOrder.actual_delivery_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  סכום כולל
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ₪{purchaseOrder.total_amount.toLocaleString()}
                </p>
              </div>

              {purchaseOrder.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      הערות
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                      {purchaseOrder.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* סטטיסטיקות */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                סטטיסטיקות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                    פריטים בהזמנה
                  </p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {items.length}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                    פריטים שהתקבלו
                  </p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {items.filter(i => i.quantity_received >= i.quantity_ordered).length}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  אחוז השלמה
                </p>
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all duration-500"
                      style={{
                        width: `${items.length > 0 
                          ? (items.reduce((acc, item) => 
                              acc + (item.quantity_received / item.quantity_ordered * 100), 0
                            ) / items.length)
                          : 0}%`
                      }}
                    />
                  </div>
                  <p className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {items.length > 0 
                      ? Math.round(items.reduce((acc, item) => 
                          acc + (item.quantity_received / item.quantity_ordered * 100), 0
                        ) / items.length)
                      : 0}%
                  </p>
                </div>
              </div>

              <Separator />

              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                  ערך ממוצע לפריט
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  ₪{items.length > 0 
                    ? Math.round(purchaseOrder.total_amount / items.length).toLocaleString()
                    : 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* טבלת פריטים */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              פריטי ההזמנה ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>אין פריטים בהזמנה זו</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        מק&quot;ט
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        שם הפריט
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        קטגוריה
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        כמות הוזמנה
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        כמות התקבלה
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        מחיר יחידה
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        סה&quot;כ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const isFullyReceived = item.quantity_received >= item.quantity_ordered
                      const isPartiallyReceived = item.quantity_received > 0 && !isFullyReceived
                      
                      return (
                        <tr 
                          key={item.id} 
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {item.part.part_number}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                            {item.part.name}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <Badge variant="outline">
                              {item.part.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-900 dark:text-gray-100">
                            {item.quantity_ordered}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-semibold ${
                              isFullyReceived 
                                ? 'text-green-600 dark:text-green-400'
                                : isPartiallyReceived
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {item.quantity_received}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">
                            ₪{item.unit_price.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-gray-100">
                            ₪{item.total_price.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td colSpan={6} className="py-3 px-4 text-left text-gray-900 dark:text-gray-100">
                        סה&quot;כ
                      </td>
                      <td className="py-3 px-4 text-left text-lg text-gray-900 dark:text-gray-100">
                        ₪{purchaseOrder.total_amount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline תקשורת */}
        <POTimeline purchaseOrderId={poId} />
      </div>
    </DashboardLayout>
  )
}