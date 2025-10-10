// apps/web/app/api/purchase-orders/generate-pdf/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { generatePurchaseOrderPDF } from '@/lib/pdf/templates/purchaseOrder'

export async function POST(request: NextRequest) {
  try {
    // קריאת הנתונים מה-body
    const body = await request.json()
    const { purchaseOrder, companyInfo, supplierInfo, items, projectInfo } = body

    // ולידציה
    if (!purchaseOrder || !companyInfo || !supplierInfo || !items) {
      return NextResponse.json(
        { error: 'Missing required data: purchaseOrder, companyInfo, supplierInfo, and items are required' },
        { status: 400 }
      )
    }

    // יצירת PDF
    const { buffer, filename } = await generatePurchaseOrderPDF(
      purchaseOrder,
      companyInfo,
      supplierInfo,
      items,
      projectInfo
    )

    // החזרת ה-PDF
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })

  } catch (error) {
    console.error('PDF Generation Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}