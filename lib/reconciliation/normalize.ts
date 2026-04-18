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
  // TODO: implement in recon sprint
  return new Decimal(val).toDecimalPlaces(2).toString()
}
