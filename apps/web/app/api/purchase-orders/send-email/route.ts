// apps/web/app/api/purchase-orders/send-email/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { generatePurchaseOrderPDF } from '@/lib/pdf/pdfGenerator'

// אתחול Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    // קריאת הנתונים
    const body = await request.json()
    const { purchaseOrder, items, emailData } = body

    // ולידציה
    if (!purchaseOrder || !items || !emailData) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    if (!emailData.to || !emailData.subject) {
      return NextResponse.json(
        { error: 'Missing email recipient or subject' },
        { status: 400 }
      )
    }

    // יצירת PDF
    const pdfBuffer = await generatePurchaseOrderPDF({
      purchaseOrder,
      items
    })

    // המרת Buffer ל-Base64 עבור Resend
    const pdfBase64 = pdfBuffer.toString('base64')

    // שליחת המייל עם Resend
    const emailResponse = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: emailData.to,
      cc: emailData.cc || [],
      subject: emailData.subject,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">
              הזמנת רכש ${purchaseOrder.po_number}
            </h2>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <p style="white-space: pre-line; color: #374151; line-height: 1.6;">
                ${emailData.message}
              </p>
            </div>

            <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; border-right: 4px solid #3b82f6;">
              <p style="color: #1e40af; margin: 0;">
                <strong>📎 מצורף:</strong> קובץ PDF של הזמנת הרכש
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                מייל זה נשלח מאת מערכת מעליתן<br/>
                לשאלות או בעיות, אנא צור קשר עם השולח
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `PO-${purchaseOrder.po_number}.pdf`,
          content: pdfBase64,
          content_type: 'application/pdf'
        }
      ]
    })

    // בדיקה אם השליחה הצליחה
    if (!emailResponse.data) {
      throw new Error('Failed to send email')
    }

    return NextResponse.json({
      success: true,
      emailId: emailResponse.data.id,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Email Sending Error:', error)
    
    // טיפול בשגיאות ספציפיות של Resend
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Email service configuration error' },
          { status: 500 }
        )
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many emails sent. Please try again later.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}