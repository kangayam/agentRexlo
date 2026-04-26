import Decimal from 'decimal.js'

// 15-char GSTIN: 2-digit state code, 10-char PAN, 1-digit entity code,
// 1 fixed 'Z', 1 alphanumeric checksum. See SPEC.md §10 Step 1.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export function normalizeGstin(gstin: string): string {
  return gstin.toUpperCase().trim()
}

export function isValidGstin(gstin: string): boolean {
  return GSTIN_PATTERN.test(normalizeGstin(gstin))
}

export function normalizeInvoiceNumber(num: string): string {
  return num.toLowerCase().replace(/[/\\\-_# ]/g, '').replace(/^0+/, '')
}

export function normalizeDecimal(val: number | string): string {
  return new Decimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)
}

export function normalizeDate(dateStr: string): string {
  // Accept DD-MM-YYYY (hyphens, IMS) or DD/MM/YYYY (slashes, Tally)
  const parts = dateStr.split(/[-/]/)
  if (parts.length !== 3) throw new Error(`Invalid date: ${dateStr}`)
  const [dd, mm, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

export function dateDiffDays(isoA: string, isoB: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.abs(Math.round(
    (new Date(isoA + 'T00:00:00Z').getTime() - new Date(isoB + 'T00:00:00Z').getTime()) / msPerDay
  ))
}
