"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Download, Send, Loader2, Eye } from "lucide-react"
import { SendPODialog } from "./SendPODialog"

type PurchaseOrder = {
  id: string
  po_number: string
  supplier: any
  order_date: string
  expected_delivery_date: string | null
  status: string
  total_amount: number
  notes: string | null
}

type POItem = {
  id: string
  part: {
    name: string
    part_number: string
    category: string
  }
  quantity_ordered: number
  quantity_received: number
  unit_price: number
  total_price: number
  notes: string | null
}

interface POPDFActionsProps {
  purchaseOrder: PurchaseOrder
  items: POItem[]
}

// פונקציה לעיצוב כתובת מאובייקט למחרוזת
function formatAddress(addressObj: any): string | null {
  if (!addressObj) return null;
  if (typeof addressObj === 'string') return addressObj;
  
  const parts = [];
  if (addressObj.street) parts.push(addressObj.street);
  if (addressObj.city) parts.push(addressObj.city);
  if (addressObj.zip) parts.push(addressObj.zip);
  if (addressObj.country) parts.push(addressObj.country);
  
  return parts.length > 0 ? parts.join(', ') : null;
}

export function POPDFActions({ purchaseOrder, items }: POPDFActionsProps) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  // יצירת PDF להורדה
  const handleDownloadPDF = async () => {
    try {
      setGenerating(true)

      const companyInfo = {
        name: "Malitan Elevators",
        logo_url: null,
        address: "123 Main Street",
        city: "Tel Aviv",
        phone: "03-1234567",
        email: "info@malitan.com"
      }

      const supplierInfo = {
        company_name: purchaseOrder.supplier?.company_name || "Unknown Supplier",
        supplier_code: purchaseOrder.supplier?.supplier_code || null,
        email: purchaseOrder.supplier?.primary_contact_email || null,
        primary_contact_phone: purchaseOrder.supplier?.primary_contact_phone || null,
        address: formatAddress(purchaseOrder.supplier?.billing_address),
        city: purchaseOrder.supplier?.billing_address?.city || null,
        primary_contact_name: purchaseOrder.supplier?.primary_contact_name || null
      }

      const response = await fetch('/api/purchase-orders/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrder,
          companyInfo,
          supplierInfo,
          items,
          projectInfo: null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('PDF Generation failed:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PO-${purchaseOrder.po_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "✅ הורדת PDF",
        description: "הקובץ הורד בהצלחה"
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      toast({
        variant: "destructive",
        title: "❌ שגיאה",
        description: "נכשל ביצירת PDF"
      })
    } finally {
      setGenerating(false)
    }
  }

  // תצוגה מקדימה של PDF
  const handlePreviewPDF = async () => {
    try {
      setPreviewing(true)

      const companyInfo = {
        name: "Malitan Elevators",
        logo_url: null,
        address: "123 Main Street",
        city: "Tel Aviv",
        phone: "03-1234567",
        email: "info@malitan.com"
      }

      const supplierInfo = {
        company_name: purchaseOrder.supplier?.company_name || "Unknown Supplier",
        supplier_code: purchaseOrder.supplier?.supplier_code || null,
        email: purchaseOrder.supplier?.primary_contact_email || null,
        primary_contact_phone: purchaseOrder.supplier?.primary_contact_phone || null,
        address: formatAddress(purchaseOrder.supplier?.billing_address),
        city: purchaseOrder.supplier?.billing_address?.city || null,
        primary_contact_name: purchaseOrder.supplier?.primary_contact_name || null
      }

      const response = await fetch('/api/purchase-orders/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrder,
          companyInfo,
          supplierInfo,
          items,
          projectInfo: null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('PDF Generation failed:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // פתיחה בחלון חדש
      window.open(url, '_blank')

      // ניקוי URL לאחר פתיחה
      setTimeout(() => window.URL.revokeObjectURL(url), 100)

      toast({
        title: "👁️ תצוגה מקדימה",
        description: "נפתח בטאב חדש"
      })
    } catch (error) {
      console.error('PDF preview error:', error)
      toast({
        variant: "destructive",
        title: "❌ שגיאה",
        description: "נכשל בפתיחת תצוגה מקדימה"
      })
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {/* כפתור תצוגה מקדימה */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviewPDF}
          disabled={previewing || generating}
        >
          {previewing ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <Eye className="h-4 w-4 ml-2" />
          )}
          תצוגה מקדימה
        </Button>

        {/* כפתור הורדה */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          disabled={generating || previewing}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 ml-2" />
          )}
          הורד PDF
        </Button>

        {/* כפתור שליחה */}
        <Button
          size="sm"
          onClick={() => setSendDialogOpen(true)}
          disabled={generating || previewing}
        >
          <Send className="h-4 w-4 ml-2" />
          שלח מייל
        </Button>
      </div>

      {/* דיאלוג שליחה */}
      <SendPODialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        purchaseOrder={purchaseOrder}
        items={items}
      />
    </>
  )
}