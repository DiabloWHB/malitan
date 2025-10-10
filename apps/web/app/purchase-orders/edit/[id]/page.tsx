"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/ui/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { ArrowRight, Construction } from "lucide-react"

export default function EditPurchaseOrderPage() {
  const params = useParams()
  const router = useRouter()
  const poId = params.id as string

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/purchase-orders/${poId}`)}
            className="mb-2"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה לפרטי ההזמנה
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            עריכת הזמנת רכש
          </h1>
        </div>

        {/* Under Construction */}
        <div className="text-center py-20">
          <Construction className="h-24 w-24 mx-auto mb-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            בפיתוח
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            דף עריכת הזמנות רכש בבנייה
          </p>
          <Button onClick={() => router.push(`/purchase-orders/${poId}`)}>
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}