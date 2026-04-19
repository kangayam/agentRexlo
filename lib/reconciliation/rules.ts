import Decimal from 'decimal.js'
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import type { MatchStrategy } from '@/lib/reconciliation/matcher'
import { normalizeGstin, dateDiffDays } from '@/lib/reconciliation/normalize'

export type ReconOutcome = 'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'

export interface ReconResult {
  imsInvoiceId: string
  imsGstin: string
  imsInvoiceNum: string
  imsValue: Decimal
  imsDate: string
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  itcAtRisk: Decimal
  result: ReconOutcome
  reason: string | null
  matchedTallyInvoiceNum: string | null
}

function isoToDMY(iso: string, sep: string): string {
  const [yyyy, mm, dd] = iso.split('-')
  return `${dd}${sep}${mm}${sep}${yyyy}`
}

export function classify(
  inv: NormalizedImsInvoice,
  tally: NormalizedTallyRow | null,
  strategy: MatchStrategy,
  isDuplicate: boolean
): ReconResult {
  const imsId = `${inv.supplierGstin}::${inv.invoiceNum}`
  const itcTotal = inv.igst.plus(inv.cgst).plus(inv.sgst)
  const base = {
    imsInvoiceId: imsId,
    imsGstin: inv.supplierGstin,
    imsInvoiceNum: inv.invoiceNum,
    imsValue: inv.totalValue,
    imsDate: inv.invoiceDate,
    igst: inv.igst,
    cgst: inv.cgst,
    sgst: inv.sgst,
  }

  if (isDuplicate) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'AUTO_REJECTED',
      reason: 'Duplicate IMS entry — same invoice uploaded twice by supplier (2 IMS entries for 1 Tally row)',
      matchedTallyInvoiceNum: null,
    }
  }

  if (!tally) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'NOT_IN_BOOKS',
      reason: 'Invoice not found in Tally books — no matching purchase entry',
      matchedTallyInvoiceNum: null,
    }
  }

  // 1. GSTIN check
  if (normalizeGstin(inv.supplierGstin) !== normalizeGstin(tally.supplierGstin)) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'AUTO_REJECTED',
      reason: `Supplier GSTIN mismatch — IMS: ${inv.supplierGstin} / Tally: ${tally.supplierGstin}`,
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }

  // 2. Value delta
  const valueDelta = tally.totalAmount.minus(inv.totalValue)
  const pct = valueDelta.div(inv.totalValue).times(100)
  const absPct = pct.abs()
  const sign = pct.gte(0) ? '+' : ''
  if (absPct.gt(10)) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'AUTO_REJECTED',
      reason: `Value delta: Tally ₹${tally.totalAmount.toFixed(0)} vs IMS ₹${inv.totalValue.toFixed(0)} (${sign}${absPct.toFixed(1)}% — exceeds 10% threshold)`,
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }
  if (absPct.gt(2)) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'PENDING_REVIEW',
      reason: `Value delta: Tally ₹${tally.totalAmount.toFixed(0)} vs IMS ₹${inv.totalValue.toFixed(0)} (${sign}${absPct.toFixed(1)}% — within 2–10% band)`,
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }

  // 3. Invoice# mismatch via Strategy B
  if (strategy === 'B') {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'PENDING_REVIEW',
      reason: `Invoice# mismatch — IMS: "${inv.invoiceNum}" / Tally: "${tally.invoiceNum}" (normalised keys differ)`,
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }

  // 4. Format-only variation (Strategy A, same normalized key, different raw strings)
  if (inv.invoiceNum !== tally.invoiceNum) {
    return {
      ...base,
      itcAtRisk: new Decimal(0),
      result: 'AUTO_ACCEPTED',
      reason: `Format-only diff — normalises to same key (IMS: "${inv.invoiceNum}" / Tally: "${tally.invoiceNum}")`,
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }

  // 5. Date gap
  const daysDiff = dateDiffDays(inv.invoiceDate, tally.invoiceDate)
  if (daysDiff > 7) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'PENDING_REVIEW',
      reason: `Date gap: ${daysDiff} days — IMS: ${isoToDMY(inv.invoiceDate, '-')} / Tally: ${isoToDMY(tally.invoiceDate, '/')}`,
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }

  // 6. Clean pass
  return {
    ...base,
    itcAtRisk: new Decimal(0),
    result: 'AUTO_ACCEPTED',
    reason: null,
    matchedTallyInvoiceNum: tally.invoiceNum,
  }
}
