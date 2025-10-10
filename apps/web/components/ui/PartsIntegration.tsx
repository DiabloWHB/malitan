"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle,
  ShoppingCart,
  Wrench,
  TrendingDown,
  Search,
  X
} from "lucide-react"

type Part = {
  id: string
  part_number: string
  name: string
  category: string
  manufacturer: string | null
  unit_price: number | null
  quantity_in_stock: number
  minimum_stock_level: number
  location: string
}

type UsedPart = {
  id?: string
  part_id: string
  quantity_used: number
  unit_price_at_use: number
  notes: string
  part?: Part
}

type PartsIntegrationProps = {
  ticketId: string
  elevatorId?: string
  onPartsChanged?: () => void
}

const CATEGORIES = {
  motor: { label: 'מנוע', icon: '⚙️' },
  cable: { label: 'כבלים', icon: '🔌' },
  door: { label: 'דלתות', icon: '🚪' },
  control: { label: 'בקרה', icon: '🎛️' },
  safety: { label: 'בטיחות', icon: '🛡️' },
  hydraulic: { label: 'הידראולי', icon: '💧' },
  electrical: { label: 'חשמל', icon: '⚡' },
  mechanical: { label: 'מכני', icon: '🔧' },
  other: { label: 'אחר', icon: '📦' }
}

export default function PartsIntegration({ ticketId, elevatorId, onPartsChanged }: PartsIntegrationProps) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [parts, setParts] = useState<Part[]>([])
  const [usedParts, setUsedParts] = useState<UsedPart[]>([])
  const [commonParts, setCommonParts] = useState<Part[]>([])
  
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [createPODialogOpen, setCreatePODialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const [newPartUsage, setNewPartUsage] = useState<UsedPart>({
    part_id: "",
    quantity_used: 1,
    unit_price_at_use: 0,
    notes: ""
  })

  const [partsForPO, setPartsForPO] = useState<{part: Part, quantity: number}[]>([])

  useEffect(() => {
    fetchData()
  }, [ticketId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch all available parts
      const { data: partsData, error: partsError } = await supabase
        .from('parts')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (partsError) throw partsError
      setParts(partsData || [])

      // Fetch parts already used in this ticket
      const { data: usageData, error: usageError } = await supabase
        .from('parts_usage')
        .select(`
          *,
          parts (*)
        `)
        .eq('ticket_id', ticketId)

      if (usageError) throw usageError

      const formattedUsage: UsedPart[] = usageData?.map(u => ({
        id: u.id,
        part_id: u.part_id,
        quantity_used: u.quantity_used,
        unit_price_at_use: u.unit_price_at_use,
        notes: u.notes || "",
        part: u.parts
      })) || []

      setUsedParts(formattedUsage)

      // Fetch common parts for this elevator model (if elevatorId exists)
      if (elevatorId) {
        await fetchCommonParts(elevatorId)
      }

    } catch (error: any) {
      console.error('Error fetching parts data:', error)
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCommonParts = async (elevatorId: string) => {
    try {
      // Get elevator details to find common parts for this model
      const { data: elevator, error: elevError } = await supabase
        .from('elevators')
        .select('manufacturer, model')
        .eq('id', elevatorId)
        .single()

      if (elevError) throw elevError

      // Get parts commonly used with this manufacturer
      const { data: commonPartsData, error: commonError } = await supabase
        .from('parts')
        .select('*')
        .eq('manufacturer', elevator.manufacturer)
        .eq('is_active', true)
        .limit(5)

      if (commonError) throw commonError
      setCommonParts(commonPartsData || [])

    } catch (error: any) {
      console.error('Error fetching common parts:', error)
    }
  }

  const getStockStatus = (part: Part) => {
    if (part.quantity_in_stock === 0) return 'out'
    if (part.quantity_in_stock <= part.minimum_stock_level) return 'low'
    return 'ok'
  }

  const getStockBadge = (part: Part) => {
    const status = getStockStatus(part)
    
    if (status === 'out') {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <AlertCircle className="h-3 w-3 ml-1" />
          אזל מהמלאי
        </Badge>
      )
    }
    
    if (status === 'low') {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          <TrendingDown className="h-3 w-3 ml-1" />
          מלאי נמוך ({part.quantity_in_stock})
        </Badge>
      )
    }
    
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 ml-1" />
        במלאי ({part.quantity_in_stock})
      </Badge>
    )
  }

  const filteredParts = parts.filter(part => {
    const matchesSearch = searchQuery === "" || 
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.part_number.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === "all" || part.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const openAddDialog = () => {
    setNewPartUsage({
      part_id: "",
      quantity_used: 1,
      unit_price_at_use: 0,
      notes: ""
    })
    setSearchQuery("")
    setSelectedCategory("all")
    setAddDialogOpen(true)
  }

  const selectPart = (part: Part) => {
    setNewPartUsage({
      part_id: part.id,
      quantity_used: 1,
      unit_price_at_use: part.unit_price || 0,
      notes: "",
      part: part
    })
  }

  const handleAddPart = async () => {
    try {
      if (!newPartUsage.part_id) {
        toast({
          title: "שגיאה",
          description: "יש לבחור חלק",
          variant: "destructive"
        })
        return
      }

      const selectedPart = parts.find(p => p.id === newPartUsage.part_id)
      if (!selectedPart) {
        toast({
          title: "שגיאה",
          description: "חלק לא נמצא",
          variant: "destructive"
        })
        return
      }

      // Check if part is in stock
      if (selectedPart.quantity_in_stock < newPartUsage.quantity_used) {
        toast({
          title: "אין מספיק במלאי",
          description: `במלאי: ${selectedPart.quantity_in_stock}, נדרש: ${newPartUsage.quantity_used}`,
          variant: "destructive"
        })
        
        // Offer to create PO
        setPartsForPO([{
          part: selectedPart,
          quantity: newPartUsage.quantity_used - selectedPart.quantity_in_stock
        }])
        setAddDialogOpen(false)
        setCreatePODialogOpen(true)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Get technician_id if assigned
      const { data: ticket } = await supabase
        .from('tickets')
        .select('assigned_to')
        .eq('id', ticketId)
        .single()

      // Insert part usage - trigger will update stock automatically
      const { error } = await supabase
        .from('parts_usage')
        .insert([{
          part_id: newPartUsage.part_id,
          ticket_id: ticketId,
          technician_id: ticket?.assigned_to || null,
          quantity_used: newPartUsage.quantity_used,
          unit_price_at_use: newPartUsage.unit_price_at_use,
          notes: newPartUsage.notes.trim() || null,
          created_by: user.id
        }])

      if (error) throw error

      toast({
        title: "✅ החלק נוסף בהצלחה",
        description: `${selectedPart.name} נוסף לקריאה והמלאי עודכן`
      })

      setAddDialogOpen(false)
      fetchData()
      onPartsChanged?.()

    } catch (error: any) {
      console.error('Error adding part:', error)
      toast({
        title: "שגיאה בהוספת החלק",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleRemovePart = async (usageId: string) => {
    if (!confirm("האם אתה בטוח שברצונך להסיר חלק זה?")) return

    try {
      // Note: Removing a part usage does NOT return it to stock automatically
      // You may want to add a trigger or manual stock adjustment
      const { error } = await supabase
        .from('parts_usage')
        .delete()
        .eq('id', usageId)

      if (error) throw error

      toast({
        title: "✅ החלק הוסר",
        description: "החלק הוסר מהקריאה"
      })

      fetchData()
      onPartsChanged?.()

    } catch (error: any) {
      console.error('Error removing part:', error)
      toast({
        title: "שגיאה בהסרת החלק",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleCreatePO = () => {
    // Navigate to PO page with pre-filled data
    const poData = encodeURIComponent(JSON.stringify(partsForPO))
    window.open(`/purchase-orders?create=true&parts=${poData}`, '_blank')
    setCreatePODialogOpen(false)
  }

  const calculateTotalCost = () => {
    return usedParts.reduce((sum, usage) => {
      return sum + (usage.quantity_used * usage.unit_price_at_use)
    }, 0)
  }

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">חלקי חילוף בשימוש</h3>
          {usedParts.length > 0 && (
            <Badge variant="outline" className="mr-2">
              {usedParts.length} חלקים
            </Badge>
          )}
        </div>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 ml-2" />
          הוסף חלק
        </Button>
      </div>

      {/* Common Parts Suggestions */}
      {commonParts.length > 0 && usedParts.length === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  חלקים נפוצים למעלית זו:
                </p>
                <div className="flex flex-wrap gap-2">
                  {commonParts.map(part => (
                    <Button
                      key={part.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        selectPart(part)
                        setAddDialogOpen(true)
                      }}
                      className="bg-white hover:bg-blue-100"
                    >
                      {part.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Used Parts List */}
      {usedParts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 mb-1">לא נעשה שימוש בחלקים עדיין</p>
            <p className="text-sm text-gray-500">
              לחץ על "הוסף חלק" כדי לרשום חלקים שנעשה בהם שימוש
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {usedParts.map(usage => (
              <Card key={usage.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {CATEGORIES[usage.part?.category as keyof typeof CATEGORIES]?.icon || '📦'}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {usage.part?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {usage.part?.part_number}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIES[usage.part?.category as keyof typeof CATEGORIES]?.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-gray-500">כמות</p>
                          <p className="font-semibold text-gray-900">
                            {usage.quantity_used}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">מחיר ליחידה</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(usage.unit_price_at_use)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">סה"כ</p>
                          <p className="font-bold text-blue-600">
                            {formatCurrency(usage.quantity_used * usage.unit_price_at_use)}
                          </p>
                        </div>
                      </div>

                      {usage.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                          <span className="font-semibold">הערות: </span>
                          {usage.notes}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => usage.id && handleRemovePart(usage.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Total Cost */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">
                    סה"כ עלות חלקים:
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateTotalCost())}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Part Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">הוספת חלק לקריאה</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Search and Filter */}
            {!newPartUsage.part && (
              <div className="sticky top-0 bg-white z-10 pb-4 border-b">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="חיפוש חלק..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="כל הקטגוריות" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הקטגוריות</SelectItem>
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <SelectItem key={key} value={key}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Selected Part or Parts List */}
            {newPartUsage.part ? (
              <Card className="border-2 border-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {CATEGORIES[newPartUsage.part.category as keyof typeof CATEGORIES]?.icon}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {newPartUsage.part.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {newPartUsage.part.part_number}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewPartUsage({ ...newPartUsage, part: undefined })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {getStockBadge(newPartUsage.part)}
                    <div>
                      <p className="text-sm text-gray-600">מחיר</p>
                      <p className="font-semibold">
                        {formatCurrency(newPartUsage.part.unit_price || 0)}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="quantity">כמות *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={newPartUsage.quantity_used}
                          onChange={(e) => setNewPartUsage({
                            ...newPartUsage,
                            quantity_used: Number(e.target.value)
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">מחיר ליחידה</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newPartUsage.unit_price_at_use}
                          onChange={(e) => setNewPartUsage({
                            ...newPartUsage,
                            unit_price_at_use: Number(e.target.value)
                          })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">הערות</Label>
                      <Input
                        id="notes"
                        value={newPartUsage.notes}
                        onChange={(e) => setNewPartUsage({
                          ...newPartUsage,
                          notes: e.target.value
                        })}
                        placeholder="הערות נוספות..."
                      />
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">סה"כ:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {formatCurrency(newPartUsage.quantity_used * newPartUsage.unit_price_at_use)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredParts.map(part => (
                  <Card
                    key={part.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => selectPart(part)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">
                            {CATEGORIES[part.category as keyof typeof CATEGORIES]?.icon}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{part.name}</p>
                            <p className="text-sm text-gray-600">{part.part_number}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStockBadge(part)}
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(part.unit_price || 0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleAddPart}
              disabled={!newPartUsage.part}
            >
              <Plus className="h-4 w-4 ml-2" />
              הוסף לקריאה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={createPODialogOpen} onOpenChange={setCreatePODialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              אין מספיק במלאי
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-3">
                החלקים הבאים אינם זמינים במלאי מספיק:
              </p>
              {partsForPO.map(({ part, quantity }) => (
                <div key={part.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-semibold text-gray-900">{part.name}</p>
                    <p className="text-sm text-gray-600">
                      במלאי: {part.quantity_in_stock}, נדרש: {quantity}
                    </p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    חסר: {quantity - part.quantity_in_stock}
                  </Badge>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600">
              האם ברצונך ליצור הזמנת רכש עבור החלקים החסרים?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePODialogOpen(false)}>
              לא, תודה
            </Button>
            <Button onClick={handleCreatePO} className="bg-blue-600 hover:bg-blue-700">
              <ShoppingCart className="h-4 w-4 ml-2" />
              צור הזמנת רכש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}