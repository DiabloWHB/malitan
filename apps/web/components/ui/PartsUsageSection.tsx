"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Package,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  User
} from "lucide-react"

type PartUsage = {
  id: string
  part_id: string
  ticket_id: string
  technician_id: string | null
  quantity_used: number
  unit_price_at_use: number | null
  notes: string | null
  used_at: string
  created_by: string | null
  part: {
    id: string
    name: string
    part_number: string
    quantity_in_stock: number
  }
  technician?: {
    id: string
    full_name: string
  }
}

interface PartsUsageSectionProps {
  ticketId: string
}

export default function PartsUsageSection({ ticketId }: PartsUsageSectionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [partsUsage, setPartsUsage] = useState<PartUsage[]>([])

  const loadPartsUsage = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('parts_usage')
        .select(`
          *,
          part:parts(id, name, part_number, quantity_in_stock),
          technician:technicians(id, full_name)
        `)
        .eq('ticket_id', ticketId)
        .order('used_at', { ascending: false })

      if (error) throw error

      console.log('Parts usage loaded:', data)
      setPartsUsage(data || [])
    } catch (err: any) {
      console.error('Error loading parts usage:', err)
      toast({
        title: "שגיאה בטעינת חלפים",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const deletePartUsage = async (usageId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק חלף זה?')) return

    try {
      const { error } = await supabase
        .from('parts_usage')
        .delete()
        .eq('id', usageId)

      if (error) throw error

      toast({
        title: "החלף נמחק בהצלחה",
        description: "החלף הוסר מהקריאה"
      })

      loadPartsUsage()
    } catch (err: any) {
      console.error('Error deleting part usage:', err)
      toast({
        title: "שגיאה במחיקת חלף",
        description: err.message,
        variant: "destructive"
      })
    }
  }

  const getTotalCost = () => {
    return partsUsage.reduce((sum, usage) => {
      const price = usage.unit_price_at_use || 0
      return sum + (price * usage.quantity_used)
    }, 0)
  }

  useEffect(() => {
    if (ticketId) {
      loadPartsUsage()
    }
  }, [ticketId])

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            חלפים בשימוש ({partsUsage.length})
          </CardTitle>
          <Button size="sm" className="bg-primary-500 hover:bg-primary-600 text-white">
            <Plus className="w-4 h-4 ml-1" />
            הוסף חלף
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : partsUsage.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              לא נעשה שימוש בחלפים
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              הוסף חלפים שהטכנאי השתמש בהם לתיקון
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {partsUsage.map((usage) => (
              <Card key={usage.id} className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Part Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {usage.part?.name || 'חלף לא ידוע'}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {usage.part?.part_number || 'N/A'}
                        </Badge>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Package className="w-4 h-4 flex-shrink-0" />
                          <span>כמות: {usage.quantity_used}</span>
                        </div>

                        {usage.unit_price_at_use && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <DollarSign className="w-4 h-4 flex-shrink-0" />
                            <span>₪{usage.unit_price_at_use.toFixed(2)} ליחידה</span>
                          </div>
                        )}

                        {usage.technician && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{usage.technician.full_name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{new Date(usage.used_at).toLocaleDateString('he-IL')}</span>
                        </div>
                      </div>

                      {/* Notes */}
                      {usage.notes && (
                        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs text-gray-600 dark:text-gray-400">
                          <strong>הערות:</strong> {usage.notes}
                        </div>
                      )}

                      {/* Total for this part */}
                      {usage.unit_price_at_use && (
                        <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          סה"כ: ₪{(usage.unit_price_at_use * usage.quantity_used).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deletePartUsage(usage.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Total Cost Summary */}
            {partsUsage.some(u => u.unit_price_at_use) && (
              <>
                <Separator className="my-4" />
                <div className="flex justify-between items-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    סה"כ עלות חלפים:
                  </span>
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    ₪{getTotalCost().toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}