import { format } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * עיצוב תאריך בעברית
 */
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: he });
}

/**
 * עיצוב תאריך ושעה
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * עיצוב מחיר
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * עיצוב מספר
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * קיצור טקסט
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * המרת HTML פשוט לטקסט
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}