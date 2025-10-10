// lib/pdf/templates/purchaseOrder.tsx

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { commonStyles } from '../utils/styles';
import { formatDate, formatNumber } from '../utils/formatting';
import { PDFHeader } from '../components/Header';
import { PDFFooter } from '../components/Footer';
import { registerHebrewFonts } from '../utils/fonts';

// רישום פונטים עבריים
registerHebrewFonts();

// ממשק להזמנת רכש
export interface PurchaseOrderPDFData {
  // פרטי הזמנה
  po_number: string;
  order_date: string;
  expected_delivery_date?: string;
  status: string;
  notes?: string;
  
  // פרטי חברה
  company: {
    name: string;
    logo?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  
  // פרטי ספק
  supplier: {
    company_name: string;
    supplier_code?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    primary_contact_name?: string;
  };
  
  // פרטי פרויקט (אופציונלי)
  project?: {
    name: string;
    project_number: string;
  };
  
  // פריטים
  items: Array<{
    part_number: string;
    name: string;
    category?: string;
    quantity_ordered: number;
    notes?: string;
  }>;
}

// סגנונות ספציפיים - משופרים
const styles = StyleSheet.create({
  // תיבת ספק מודגשת
  supplierBox: {
    border: '2pt solid #2563eb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    backgroundColor: '#eff6ff',
  },
  
  supplierTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    textAlign: 'right',
    fontFamily: 'Rubik',
    letterSpacing: 0.3,
  },
  
  supplierInfo: {
    fontSize: 10,
    marginBottom: 5,
    textAlign: 'right',
    fontFamily: 'Rubik',
    lineHeight: 1.6,
    color: '#1f2937',
  },
  
  // תיבת מידע
  infoBox: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4b5563',
    fontFamily: 'Rubik',
  },
  
  infoValue: {
    fontSize: 10,
    color: '#1f2937',
    fontFamily: 'Rubik',
  },
  
  // טבלת פריטים
  tableContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  
  tableTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
    fontFamily: 'Rubik',
    color: '#1e40af',
    letterSpacing: 0.3,
  },
  
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#2563eb',
    color: 'white',
    padding: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'right',
    fontFamily: 'Rubik',
    letterSpacing: 0.2,
  },
  
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottom: '1pt solid #e5e7eb',
    padding: 10,
    minHeight: 35,
  },
  
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  
  tableCell: {
    fontSize: 9,
    textAlign: 'right',
    fontFamily: 'Rubik',
    lineHeight: 1.5,
    color: '#374151',
  },
  
  // סיכום
  summaryBox: {
    backgroundColor: '#eff6ff',
    border: '2pt solid #2563eb',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Rubik',
    color: '#1e40af',
  },
  
  summaryValue: {
    fontSize: 11,
    color: '#1e40af',
    fontFamily: 'Rubik',
    fontWeight: 'bold',
  },
  
  // הערות
  notesBox: {
    backgroundColor: '#fef3c7',
    border: '1pt solid #f59e0b',
    borderRadius: 6,
    padding: 12,
    marginTop: 20,
  },
  
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 6,
    fontFamily: 'Rubik',
  },
  
  notesText: {
    fontSize: 9,
    color: '#78350f',
    textAlign: 'right',
    lineHeight: 1.6,
    fontFamily: 'Rubik',
  },
  
  // חתימות
  signaturesContainer: {
    marginTop: 35,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  
  signatureBox: {
    width: '45%',
    borderTop: '2pt solid #374151',
    paddingTop: 8,
  },
  
  signatureLabel: {
    fontSize: 9,
    textAlign: 'center',
    color: '#6b7280',
    fontFamily: 'Rubik',
    lineHeight: 1.5,
  },
  
  // אזהרה
  warningBox: {
    backgroundColor: '#fee2e2',
    border: '1pt solid #ef4444',
    borderRadius: 6,
    padding: 10,
    marginTop: 20,
  },
  
  warningText: {
    fontSize: 8,
    color: '#991b1b',
    textAlign: 'center',
    fontFamily: 'Rubik',
    lineHeight: 1.5,
  },
  
  // מספר הזמנה גדול
  poNumberContainer: {
    alignItems: 'center', 
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  
  poNumberTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    fontFamily: 'Rubik',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  
  poNumberValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    fontFamily: 'Rubik',
    letterSpacing: 1,
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    marginTop: 15,
    textAlign: 'right',
    fontFamily: 'Rubik',
    letterSpacing: 0.3,
  },
});

// קומפוננט ראשי
export const PurchaseOrderPDF: React.FC<{ data: PurchaseOrderPDFData }> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Header */}
        <PDFHeader
          companyName={data.company.name}
          companyLogo={data.company.logo}
          documentTitle="הזמנת רכש"
          documentNumber={data.po_number}
          documentDate={formatDate(data.order_date)}
        />
        
        {/* מספר הזמנה גדול */}
        <View style={styles.poNumberContainer}>
          <Text style={styles.poNumberTitle}>
            הזמנת רכש מספר
          </Text>
          <Text style={styles.poNumberValue}>
            {data.po_number}
          </Text>
        </View>
        
        {/* פרטי ספק */}
        <Text style={styles.sectionTitle}>פרטי ספק</Text>
        <View style={styles.supplierBox}>
          <Text style={styles.supplierInfo}>
            <Text style={{ fontWeight: 'bold' }}>שם חברה: </Text>
            {data.supplier.company_name}
          </Text>
          {data.supplier.supplier_code && (
            <Text style={styles.supplierInfo}>
              <Text style={{ fontWeight: 'bold' }}>קוד ספק: </Text>
              {data.supplier.supplier_code}
            </Text>
          )}
          {data.supplier.primary_contact_name && (
            <Text style={styles.supplierInfo}>
              <Text style={{ fontWeight: 'bold' }}>איש קשר: </Text>
              {data.supplier.primary_contact_name}
            </Text>
          )}
          {data.supplier.phone && (
            <Text style={styles.supplierInfo}>
              <Text style={{ fontWeight: 'bold' }}>טלפון: </Text>
              {data.supplier.phone}
            </Text>
          )}
          {data.supplier.email && (
            <Text style={styles.supplierInfo}>
              <Text style={{ fontWeight: 'bold' }}>דואל: </Text>
              {data.supplier.email}
            </Text>
          )}
          {data.supplier.address && (
            <Text style={styles.supplierInfo}>
              <Text style={{ fontWeight: 'bold' }}>כתובת: </Text>
              {data.supplier.address}
            </Text>
          )}
        </View>
        
        {/* מידע כללי */}
        <Text style={styles.sectionTitle}>פרטי הזמנה</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>תאריך הזמנה:</Text>
            <Text style={styles.infoValue}>{formatDate(data.order_date)}</Text>
          </View>
          
          {data.expected_delivery_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>תאריך אספקה מבוקש:</Text>
              <Text style={styles.infoValue}>
                {formatDate(data.expected_delivery_date)}
              </Text>
            </View>
          )}
          
          {data.project && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>פרויקט:</Text>
              <Text style={styles.infoValue}>
                {data.project.name} ({data.project.project_number})
              </Text>
            </View>
          )}
        </View>
        
        {/* טבלת פריטים */}
        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>פריטים להזמנה</Text>
          
          {/* כותרת טבלה */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '8%' }]}>מס</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>קוד פריט</Text>
            <Text style={[styles.tableHeaderCell, { width: '32%' }]}>שם הפריט</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>קטגוריה</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>
              כמות
            </Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>הערות</Text>
          </View>
          
          {/* שורות */}
          {data.items.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow,
                index % 2 === 1 && styles.tableRowEven
              ]}
            >
              <Text style={[styles.tableCell, { width: '8%' }]}>
                {index + 1}
              </Text>
              <Text style={[styles.tableCell, { width: '22%', fontWeight: 'bold' }]}>
                {item.part_number || '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '32%' }]}>
                {item.name || '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '18%' }]}>
                {item.category || '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'center', fontWeight: 'bold' }]}>
                {formatNumber(item.quantity_ordered)}
              </Text>
              <Text style={[styles.tableCell, { width: '10%', fontSize: 8 }]}>
                {item.notes || '-'}
              </Text>
            </View>
          ))}
        </View>
        
        {/* סיכום */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>סך הכל פריטים להזמנה:</Text>
            <Text style={styles.summaryValue}>
              {formatNumber(data.items.length)} פריטים
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>סך הכל יחידות:</Text>
            <Text style={styles.summaryValue}>
              {formatNumber(
                data.items.reduce((sum, item) => sum + item.quantity_ordered, 0)
              )} יחידות
            </Text>
          </View>
        </View>
        
        {/* הערות */}
        {data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>הערות והנחיות:</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}
        
        {/* אזהרת מחירים */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            הזמנה זו אינה כוללת מחירים ומשמשת לצורך תיאום לוגיסטי בלבד
          </Text>
          <Text style={[styles.warningText, { marginTop: 3 }]}>
            המחירים יקבעו בהתאם להסכם המסגרת או להצעת המחיר שאושרה
          </Text>
        </View>
        
        {/* חתימות */}
        <View style={styles.signaturesContainer}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>חתימת המזמין</Text>
            <Text style={[styles.signatureLabel, { marginTop: 5, fontWeight: 'bold' }]}>
              {data.company.name}
            </Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>חתימת הספק</Text>
            <Text style={[styles.signatureLabel, { marginTop: 5, fontWeight: 'bold' }]}>
              {data.supplier.company_name}
            </Text>
          </View>
        </View>
        
        {/* Footer */}
        <PDFFooter
          companyName={data.company.name}
          companyPhone={data.company.phone}
          companyEmail={data.company.email}
        />
      </Page>
    </Document>
  );
};

// פונקציה ליצירת PDF מהזמנת רכש
export async function generatePurchaseOrderPDF(
  purchaseOrder: any,
  companyInfo: any,
  supplierInfo: any,
  items: any[],
  projectInfo?: any
): Promise<{ blob: Blob; buffer: Buffer; filename: string }> {
  const { generatePDFBlob, generatePDFBuffer } = await import('../pdfGenerator');
  
  // הכנת הנתונים
  const pdfData: PurchaseOrderPDFData = {
    po_number: purchaseOrder.po_number,
    order_date: purchaseOrder.order_date,
    expected_delivery_date: purchaseOrder.expected_delivery_date,
    status: purchaseOrder.status,
    notes: purchaseOrder.notes,
    
    company: {
      name: companyInfo.name,
      logo: companyInfo.logo_url,
      address: companyInfo.address,
      city: companyInfo.city,
      phone: companyInfo.phone,
      email: companyInfo.email,
    },
    
    supplier: {
      company_name: supplierInfo.company_name,
      supplier_code: supplierInfo.supplier_code,
      email: supplierInfo.email,
      phone: supplierInfo.phone,
      address: supplierInfo.address,
      city: supplierInfo.city,
      primary_contact_name: supplierInfo.primary_contact_name,
    },
    
    items: items.map(item => ({
      part_number: item.part?.part_number || item.part_number || 'N/A',
      name: item.part?.name || item.name || 'Unknown Part',
      category: item.part?.category || item.category || 'General',
      quantity_ordered: item.quantity_ordered || 0,
      notes: item.notes || null,
    })),
  };
  
  // אם יש פרויקט
  if (projectInfo) {
    pdfData.project = {
      name: projectInfo.name,
      project_number: projectInfo.project_number,
    };
  }
  
  // יצירת הקומפוננט
  const document = <PurchaseOrderPDF data={pdfData} />;
  
  // יצירת PDF
  const blob = await generatePDFBlob(document);
  const buffer = await generatePDFBuffer(document);
  const filename = `הזמנת-רכש-${pdfData.po_number}.pdf`;
  
  return { blob, buffer, filename };
}