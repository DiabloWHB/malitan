"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Send, Mail } from "lucide-react"

type PurchaseOrder = {
  id: string
  po_number: string
  supplier: string | {
    company_name: string
    supplier_code: string
    email?: string
    primary_contact_phone?: string
    address?: string
    city?: string
    primary_contact_name?: string
  } | null
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

interface SendPODialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrder: PurchaseOrder
  items: POItem[]
}

export function SendPODialog({ 
  open, 
  onOpenChange, 
  purchaseOrder, 
  items 
}: SendPODialogProps) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    recipient_email: "",
    cc_emails: "",
    subject: `הזמנת רכש ${purchaseOrder.po_number} - ${purchaseOrder.supplier}`,
    message: `שלום,

מצורף בזאת הזמנת רכש מספר ${purchaseOrder.po_number}.

פרטי ההזמנה:
- ספק: ${purchaseOrder.supplier}
- תאריך הזמנה: ${new Date(purchaseOrder.order_date).toLocaleDateString('he-IL')}
- תאריך אספקה צפוי: ${purchaseOrder.expected_delivery_date ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString('he-IL') : 'לא צוין'}
- סה"כ: ₪${purchaseOrder.total_amount.toLocaleString()}

אנא אשרו קבלת ההזמנה.

בברכה,
צוות מעליתן`
  })

  const handleSend = async () => {
    // ולידציה
    if (!formData.recipient_email) {
      toast({
        variant: "destructive",
        title: "❌ שגיאה",
        description: "יש להזין כתובת מייל"
      })
      return
    }

    // וולידציית מייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.recipient_email)) {
      toast({
        variant: "destructive",
        title: "❌ שגיאה",
        description: "כתובת מייל לא תקינה"
      })
      return
    }

    try {
      setSending(true)

      // קריאה ל-API לשליחת מייל עם PDF
      const response = await fetch('/api/purchase-orders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrder,
          items,
          emailData: {
            to: formData.recipient_email,
            cc: formData.cc_emails.split(',').map(e => e.trim()).filter(Boolean),
            subject: formData.subject,
            message: formData.message
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send email')
      }

      const result = await response.json()

      // רישום בטבלת תקשורת
      const { data: user } = await supabase.auth.getUser()
      
      await supabase
        .from('purchase_order_communications')
        .insert({
          purchase_order_id: purchaseOrder.id,
          communication_type: 'email_sent',
          subject: formData.subject,
          recipient_email: formData.recipient_email,
          status: 'sent',
          metadata: {
            cc: formData.cc_emails.split(',').map(e => e.trim()).filter(Boolean),
            message: formData.message,
            email_id: result.emailId
          },
          created_by: user.user?.id
        })

      toast({
        title: "✅ המייל נשלח",
        description: `נשלח בהצלחה אל ${formData.recipient_email}`
      })

      onOpenChange(false)
      
      // איפוס הטופס
      setFormData(prev => ({
        ...prev,
        recipient_email: "",
        cc_emails: ""
      }))

    } catch (error) {
      console.error('Email sending error:', error)
      toast({
        variant: "destructive",
        title: "❌ שגיאה בשליחה",
        description: error instanceof Error ? error.message : "נכשל בשליחת המייל"
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            שליחת הזמנת רכש במייל
          </DialogTitle>
          <DialogDescription>
            המייל יכלול את הזמנת הרכש כקובץ PDF מצורף
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* כתובת נמען */}
          <div className="space-y-2">
            <Label htmlFor="recipient">
              כתובת מייל נמען <span className="text-red-500">*</span>
            </Label>
            <Input
              id="recipient"
              type="email"
              placeholder="supplier@example.com"
              value={formData.recipient_email}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                recipient_email: e.target.value 
              }))}
              disabled={sending}
            />
          </div>

          {/* העתק */}
          <div className="space-y-2">
            <Label htmlFor="cc">
              העתק (CC) - מופרד בפסיקים
            </Label>
            <Input
              id="cc"
              type="text"
              placeholder="email1@example.com, email2@example.com"
              value={formData.cc_emails}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                cc_emails: e.target.value 
              }))}
              disabled={sending}
            />
            <p className="text-xs text-gray-500">
              ניתן להזין מספר כתובות מופרדות בפסיקים
            </p>
          </div>

          {/* נושא */}
          <div className="space-y-2">
            <Label htmlFor="subject">נושא המייל</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                subject: e.target.value 
              }))}
              disabled={sending}
            />
          </div>

          {/* תוכן ההודעה */}
          <div className="space-y-2">
            <Label htmlFor="message">תוכן ההודעה</Label>
            <Textarea
              id="message"
              rows={8}
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                message: e.target.value 
              }))}
              disabled={sending}
              className="resize-none font-mono text-sm"
            />
          </div>

          {/* הערה */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>שים לב:</strong> הזמנת הרכש תצורף אוטומטית כקובץ PDF
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            ביטול
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !formData.recipient_email}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                שלח מייל
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}