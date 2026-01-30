import { format, parseISO } from 'date-fns'

/**
 * Format a number as USD currency: "$1,234.56"
 * Returns "-" for null/undefined values.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Format a date string as "Jan 15, 2026"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

/**
 * Format a date string as "1/15/26"
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'M/d/yy')
}

/**
 * Format a date string as "Jan 15, 2026 3:45 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy h:mm a')
}

/**
 * Format decimal hours as "2h 30m"
 */
export function formatDuration(hours: number | null | undefined): string {
  if (hours == null) return '-'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Format minutes as "1h 30m"
 */
export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '-'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Format a phone number as "(555) 123-4567"
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '-'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

/**
 * Format a case number as "EW-2026-0042"
 */
export function formatCaseNumber(year: number, seq: number): string {
  return `EW-${year}-${seq.toString().padStart(4, '0')}`
}

/**
 * Truncate text to maxLength characters with "..."
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
