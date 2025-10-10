// lib/pdf/utils/styles.ts

import { StyleSheet } from '@react-pdf/renderer';

/**
 * סגנונות משותפים לכל מסמכי ה-PDF - עם תמיכה מלאה בעברית
 */
export const commonStyles = StyleSheet.create({
  // Page
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: 'Rubik',
    direction: 'rtl',
    backgroundColor: '#ffffff',
  },
  
  // Headers
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'right',
    fontFamily: 'Rubik',
    color: '#1e3a8a',
  },
  
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
    fontFamily: 'Rubik',
    color: '#1e40af',
  },
  
  h3: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'right',
    fontFamily: 'Rubik',
    color: '#3b82f6',
  },
  
  // Text
  text: {
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'right',
    fontFamily: 'Rubik',
  },
  
  textBold: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
    fontFamily: 'Rubik',
  },
  
  textSmall: {
    fontSize: 9,
    textAlign: 'right',
    fontFamily: 'Rubik',
    color: '#666',
  },
  
  // English text (for company names, etc.)
  textEnglish: {
    fontSize: 11,
    textAlign: 'left',
    fontFamily: 'Helvetica', // אנגלית נשאר Helvetica
    direction: 'ltr',
  },
  
  // Header & Footer
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '2pt solid #3b82f6',
  },
  
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 10,
    fontFamily: 'Rubik',
  },
  
  // Layout
  row: {
    flexDirection: 'row-reverse',
    marginBottom: 5,
  },
  
  spaceBetween: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Tables
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: 8,
    fontFamily: 'Rubik',
    fontWeight: 'bold',
  },
  
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottom: '1pt solid #e5e7eb',
    padding: 6,
  },
  
  tableCell: {
    fontSize: 9,
    textAlign: 'right',
    fontFamily: 'Rubik',
  },
  
  tableCellBold: {
    fontSize: 9,
    textAlign: 'right',
    fontFamily: 'Rubik',
    fontWeight: 'bold',
  },
  
  // Boxes
  infoBox: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    fontFamily: 'Rubik',
  },
  
  supplierBox: {
    border: '2pt solid #3b82f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#eff6ff',
    fontFamily: 'Rubik',
  },
  
  // Colors
  primary: {
    color: '#3b82f6',
  },
  
  success: {
    color: '#10b981',
  },
  
  warning: {
    color: '#f59e0b',
  },
  
  danger: {
    color: '#ef4444',
  },
  
  muted: {
    color: '#6b7280',
  },
});