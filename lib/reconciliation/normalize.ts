import Decimal from 'decimal.js'

export function normalizeGstin(gstin: string): string {
  // TODO: implement in recon sprint
  return gstin.toUpperCase().trim()
}

export function normalizeInvoiceNumber(num: string): string {
  // TODO: implement in recon sprint — lowercase, strip /\-_# and spaces, drop leading zeros
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
