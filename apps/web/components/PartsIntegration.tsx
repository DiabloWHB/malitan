"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Package, Plus, Trash2, Loader2, AlertCircle } from "lucide-react"

type TicketPart = {
  id: string
  ticket_id: string
  part_id: string
  quantity: number
  parts?: {
    id: string
    name: string
    part_number: string
    current_stock: number
    unit_price: number
  }
}

type Part = {
  id: string
  name: string
  part_number: string
  current_stock: number
  unit_price: number
}

interface PartsIntegrationProps {
  ticketId: string
  elevatorId?: string
  onPartsChanged?: () => void
}

export default function PartsIntegration({ ticketId, elevatorId, onPartsChanged }: PartsIntegrationProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [ticketParts, setTicketParts] = useState<TicketPart[]>([])
  const [availableParts, setAvailableParts] = useState<Part[]>([])
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedPartId, setSelectedPartId] = useState("")
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (ticketId) {
      fetchTicketParts()
      fetchAvailableParts()
    }
  }, [ticketId])

  const fetchTicketParts = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_parts')
        .select(`
          id,
          ticket_id,
          part_id,
          quantity,
          parts (
            id,
            name,
            part_number,
            current_stock,
            unit_price
          )
        `)
        .eq('ticket_id', ticketId)

      if (error) throw error
      setTicketParts(data || [])
    } catch (error: any) {
      console.error('Error fetching ticket parts:', error)
    }
  }

  const fetchAvailableParts = async () => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('id, name, part_number, current_stock, unit_price')
        .gt('current_stock', 0)
        .order('name')

      if (error) throw error
      setAvailableParts(data || [])
    } catch (error: any) {
      console.error('Error fetching available parts:', error)
    }
  }

  const handleAddPart = async () => {
    if (!selectedPartId || quantity < 1) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חלק ולהזין כמות תקינה",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_parts')
        .insert([{
          ticket_id: ticketId,
          part_id: selectedPartId,
          quantity: quantity
        }])

      if (error) throw error

      toast({
        title: "החלק נוסף בהצלחה",
        description: "החלק נוסף לקריאה"
      })

      setAddDialogOpen(false)
      setSelectedPartId("")
      setQuantity(1)
      fetchTicketParts()
      if (onPartsChanged) onPartsChanged()
    } catch (error: any) {
      toast({
        title: "שגיאה בהוספת חלק",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePart = async (ticketPartId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_parts')
        .delete()
        .eq('id', ticketPartId)

      if (error) throw error

      toast({
        title: "החלק הוסר בהצלחה",
        description: "החלק הוסר מהקריאה"
      })

      fetchTicketParts()
      if (onPartsChanged) onPartsChanged()
    } catch (error: any) {
      toast({
        title: "שגיאה בהסרת חלק",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const totalCost = ticketParts.reduce((sum, tp) => {
    const unitPrice = tp.parts?.unit_price || 0
    return sum + (unitPrice * tp.quantity)
  }, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            חלקי חילוף
          </CardTitle>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 ml-2" />
                הוסף חלק
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוסף חלק חילוף לקריאה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="part">חלק</Label>
                  <select
                    id="part"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                  >
                    <option value="">בחר חלק</option>
                    {availableParts.map(part => (
                      <option key={part.id} value={part.id}>
                        {part.name} ({part.part_number}) - במלאי: {part.current_stock}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="quantity">כמות</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    ביטול
                  </Button>
                  <Button onClick={handleAddPart} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                    הוסף
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {ticketParts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>לא נוספו חלקי חילוף לקריאה זו</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ticketParts.map(tp => (
              <div key={tp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{tp.parts?.name}</p>
                  <p className="text-sm text-gray-600">
                    {tp.parts?.part_number} • כמות: {tp.quantity}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    ₪{((tp.parts?.unit_price || 0) * tp.quantity).toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePart(tp.id)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">סה"כ:</span>
                <span className="text-lg font-bold">₪{totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
