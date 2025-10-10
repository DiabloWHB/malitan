"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Mail, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Send,
  Eye,
  Download
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { he } from "date-fns/locale"

type Communication = {
  id: string
  purchase_order_id: string
  communication_type: 'email_sent' | 'email_opened' | 'email_bounced' | 'pdf_downloaded' | 'status_change' | 'note'
  subject: string | null
  recipient_email: string | null
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed'
  metadata: any
  created_at: string
  created_by: string
  user?: {
    full_name: string
  }
}

interface POTimelineProps {
  purchaseOrderId: string
}

const COMM_TYPE_CONFIG = {
  email_sent: {
    icon: Send,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'מייל נשלח'
  },
  email_opened: {
    icon: Eye,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'המייל נפתח'
  },
  email_bounced: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'כשל בשליחה'
  },
  pdf_downloaded: {
    icon: Download,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'PDF הורד'
  },
  status_change: {
    icon: CheckCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'שינוי סטטוס'
  },
  note: {
    icon: User,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    label: 'הערה'
  }
}

const STATUS_CONFIG = {
  pending: { label: 'ממתין', color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'נשלח', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'נמסר', color: 'bg-green-100 text-green-800' },
  opened: { label: 'נפתח', color: 'bg-purple-100 text-purple-800' },
  failed: { label: 'נכשל', color: 'bg-red-100 text-red-800' }
}

export function POTimeline({ purchaseOrderId }: POTimelineProps) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCommunications()
    
    // Real-time subscription לעדכונים חדשים
    const channel = supabase
      .channel(`po_comms_${purchaseOrderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_order_communications',
          filter: `purchase_order_id=eq.${purchaseOrderId}`
        },
        () => {
          fetchCommunications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [purchaseOrderId])

  const fetchCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_communications')
        .select(`
          *,
          user:profiles!created_by (
            full_name
          )
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      setCommunications(data || [])
    } catch (error) {
      console.error('Error fetching communications:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // אם אין תקשורת, פשוט נציג מסך ריק (זה לא באמת שגיאה)
      setCommunications([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            היסטוריית תקשורת
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (communications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            היסטוריית תקשורת
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">אין היסטוריית תקשורת</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          היסטוריית תקשורת ({communications.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {communications.map((comm, index) => {
              const config = COMM_TYPE_CONFIG[comm.communication_type]
              const Icon = config.icon
              const statusConfig = STATUS_CONFIG[comm.status]

              return (
                <div key={comm.id}>
                  <div className="flex gap-3">
                    {/* אייקון */}
                    <div className={`rounded-full p-2 ${config.bgColor} flex-shrink-0`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    {/* תוכן */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {config.label}
                          </p>
                          {comm.subject && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                              {comm.subject}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* פרטים נוספים */}
                      <div className="text-xs text-gray-500 space-y-1">
                        {comm.recipient_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{comm.recipient_email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{comm.user?.full_name || 'מערכת'}</span>
                          <span className="mx-1">•</span>
                          <span>
                            {formatDistanceToNow(new Date(comm.created_at), {
                              addSuffix: true,
                              locale: he
                            })}
                          </span>
                        </div>

                        {/* מטא-דאטה נוסף */}
                        {comm.metadata && Object.keys(comm.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                              פרטים נוספים
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                              {JSON.stringify(comm.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* מפריד */}
                  {index < communications.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}