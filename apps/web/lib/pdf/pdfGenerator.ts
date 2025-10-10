// lib/pdf/pdfGenerator.ts

import { pdf } from '@react-pdf/renderer';
import { registerHebrewFonts } from './utils/fonts';

/**
 * ממשק כללי לכל מסמך PDF
 */
export interface PDFDocument {
  id: string;
  type: 'purchase_order' | 'work_report' | 'invoice' | 'quotation' | 'maintenance_report';
  data: any;
}

/**
 * ממשק להגדרות PDF
 */
export interface PDFOptions {
  filename?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  metadata?: Record<string, any>;
}

/**
 * רישום פונטים עבריים (יופעל רק פעם אחת)
 */
let fontsRegistered = false;

function ensureHebrewFonts() {
  if (!fontsRegistered) {
    try {
      registerHebrewFonts();
      fontsRegistered = true;
      console.log('Hebrew fonts registered for PDF generation');
    } catch (error) {
      console.warn('Failed to register Hebrew fonts:', error);
    }
  }
}

/**
 * יצירת PDF כ-Blob (להורדה)
 */
export async function generatePDFBlob(
  document: React.ReactElement,
  options?: PDFOptions
): Promise<Blob> {
  ensureHebrewFonts();
  
  const pdfDoc = pdf(document);
  return await pdfDoc.toBlob();
}

/**
 * יצירת PDF כ-Buffer (לשליחה במייל)
 */
export async function generatePDFBuffer(
  document: React.ReactElement,
  options?: PDFOptions
): Promise<Buffer> {
  ensureHebrewFonts();
  
  const blob = await generatePDFBlob(document, options);
  return Buffer.from(await blob.arrayBuffer());
}

/**
 * יצירת URL להורדת PDF
 */
export async function generatePDFURL(
  document: React.ReactElement,
  options?: PDFOptions
): Promise<string> {
  const blob = await generatePDFBlob(document, options);
  return URL.createObjectURL(blob);
}

/**
 * הורדת PDF ישירות
 */
export async function downloadPDF(
  document: React.ReactElement,
  filename: string = 'document.pdf'
): Promise<void> {
  const url = await generatePDFURL(document);
  
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  // ניקוי
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * פתיחת PDF בחלון חדש
 */
export async function openPDFInNewWindow(
  document: React.ReactElement
): Promise<void> {
  const url = await generatePDFURL(document);
  window.open(url, '_blank');
}

/**
 * יצירת PDF עם metadata מלא
 */
export async function generatePDFWithMetadata(
  document: React.ReactElement,
  options: PDFOptions
): Promise<{ blob: Blob; buffer: Buffer; url: string }> {
  const blob = await generatePDFBlob(document, options);
  const buffer = Buffer.from(await blob.arrayBuffer());
  const url = URL.createObjectURL(blob);
  
  return { blob, buffer, url };
}