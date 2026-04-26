import Decimal from 'decimal.js'
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import type { MatchStrategy } from '@/lib/reconciliation/matcher'
import { normalizeGstin, dateDiffDays } from '@/lib/reconciliation/normalize'
import { buildReason, REASON_CODES } from '@/lib/reconciliation/reasons'

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
      reason: buildReason(REASON_CODES.DUPLICATE),
      matchedTallyInvoiceNum: null,
    }
  }

  if (!tally) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'NOT_IN_BOOKS',
      reason: buildReason(REASON_CODES.NOT_IN_BOOKS),
      matchedTallyInvoiceNum: null,
    }
  }

  // 1. GSTIN check
  if (normalizeGstin(inv.supplierGstin) !== normalizeGstin(tally.supplierGstin)) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'AUTO_REJECTED',
      reason: buildReason(REASON_CODES.GSTIN_MISMATCH, {
        imsGstin: inv.supplierGstin,
        tallyGstin: tally.supplierGstin,
      }),
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }

  // 2. Value delta
  const valueDelta = tally.totalAmount.minus(inv.totalValue)
  const pct = valueDelta.div(inv.totalValue).times(100)
  const absPct = pct.abs()
  const sign = pct.gte(0) ? '+' : ''
  const valueParams = {
    tallyValue: tally.totalAmount.toFixed(0),
    imsValue: inv.totalValue.toFixed(0),
    sign,
    pct: absPct.toFixed(1),
  }
  if (absPct.gt(10)) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'AUTO_REJECTED',
      reason: buildReason(REASON_CODES.VALUE_OVER_10, valueParams),
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }
  if (absPct.gt(2)) {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'PENDING_REVIEW',
      reason: buildReason(REASON_CODES.VALUE_2_TO_10, valueParams),
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }

  // 3. Invoice# mismatch via Strategy B
  if (strategy === 'B') {
    return {
      ...base,
      itcAtRisk: itcTotal,
      result: 'PENDING_REVIEW',
      reason: buildReason(REASON_CODES.SOFT_INVOICE_MATCH, {
        imsInv: inv.invoiceNum,
        tallyInv: tally.invoiceNum,
      }),
      matchedTallyInvoiceNum: tally.invoiceNum,
    }
  }

  // 4. Format-only variation (Strategy A, same normalised key, different raw strings)
  if (inv.invoiceNum !== tally.invoiceNum) {
    return {
      ...base,
      itcAtRisk: new Decimal(0),
      result: 'AUTO_ACCEPTED',
      reason: buildReason(REASON_CODES.FORMAT_VARIATION, {
        imsInv: inv.invoiceNum,
        tallyInv: tally.invoiceNum,
      }),
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
      reason: buildReason(REASON_CODES.DATE_GAP, {
        days: daysDiff,
        imsDate: isoToDMY(inv.invoiceDate, '-'),
        tallyDate: isoToDMY(tally.invoiceDate, '/'),
      }),
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
