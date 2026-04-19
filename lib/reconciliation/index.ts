import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import { normalizeGstin, normalizeInvoiceNumber } from '@/lib/reconciliation/normalize'
import { findCandidates } from '@/lib/reconciliation/matcher'
import { classify, type ReconResult } from '@/lib/reconciliation/rules'

export type { ReconResult } from '@/lib/reconciliation/rules'
export type { ReconOutcome } from '@/lib/reconciliation/rules'

export function reconcile(
  imsInvoices: NormalizedImsInvoice[],
  tallyRows: NormalizedTallyRow[]
): ReconResult[] {
  // Build tally index for Strategy A
  const tallyByInvoice = new Map<string, NormalizedTallyRow[]>()
  for (const row of tallyRows) {
    const key = normalizeInvoiceNumber(row.invoiceNum)
    const existing = tallyByInvoice.get(key) ?? []
    existing.push(row)
    tallyByInvoice.set(key, existing)
  }

  // Detect IMS duplicates (same normalized GSTIN::invoiceNum appears > 1 time)
  const imsKeyCount = new Map<string, number>()
  for (const inv of imsInvoices) {
    const key = `${normalizeGstin(inv.supplierGstin)}::${normalizeInvoiceNumber(inv.invoiceNum)}`
    imsKeyCount.set(key, (imsKeyCount.get(key) ?? 0) + 1)
  }

  const isDuplicateInv = (inv: NormalizedImsInvoice): boolean => {
    const key = `${normalizeGstin(inv.supplierGstin)}::${normalizeInvoiceNumber(inv.invoiceNum)}`
    return (imsKeyCount.get(key) ?? 0) > 1
  }

  // Process each IMS invoice — deduplicate so each unique GSTIN::invoiceNum appears once
  const seen = new Set<string>()
  const results: ReconResult[] = []

  for (const inv of imsInvoices) {
    const dedupeKey = `${normalizeGstin(inv.supplierGstin)}::${normalizeInvoiceNumber(inv.invoiceNum)}`

    if (isDuplicateInv(inv)) {
      // Emit one result per duplicate group (not one per duplicate instance)
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey)
        results.push(classify(inv, null, 'none', true))
      }
    } else {
      seen.add(dedupeKey)
      const { tally, strategy } = findCandidates(inv, tallyByInvoice, tallyRows)
      results.push(classify(inv, tally, strategy, false))
    }
  }

  return results
}
