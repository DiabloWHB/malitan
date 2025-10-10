// lib/pdf/utils/fonts.ts

import { Font } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';

/**
 * רישום פונטים עבריים ל-React PDF
 */
export function registerHebrewFonts() {
  try {
    // בניית נתיבים מלאים לפונטים
    const regularPath = path.join(process.cwd(), 'public', 'fonts', 'Rubik-Regular.ttf');
    const boldPath = path.join(process.cwd(), 'public', 'fonts', 'Rubik-Bold.ttf');
    
    // בדיקה שהקבצים קיימים
    if (!fs.existsSync(regularPath)) {
      console.warn(`⚠️ Font file not found at: ${regularPath}`);
      console.warn('Falling back to Helvetica');
      return;
    }
    
    // רישום פונט Rubik לתמיכה בעברית
    Font.register({
      family: 'Rubik',
      fonts: [
        {
          src: regularPath,
          fontWeight: 'normal',
        },
        {
          src: fs.existsSync(boldPath) ? boldPath : regularPath,
          fontWeight: 'bold',
        }
      ]
    });
    
    console.log(`✅ Hebrew fonts registered successfully:`);
    console.log(`   Regular: ${regularPath}`);
    if (fs.existsSync(boldPath)) {
      console.log(`   Bold: ${boldPath}`);
    }
  } catch (error) {
    console.error('❌ Failed to register Hebrew fonts:', error);
    console.warn('Falling back to Helvetica');
  }
}

/**
 * קבלת משפחת פונט עברית
 */
export function getHebrewFontFamily(): string {
  return 'Rubik';
}

/**
 * פונט עברי עם גיבוי
 */
export function getHebrewFontStack(): string[] {
  return ['Rubik', 'Helvetica', 'Arial'];
}