import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import { normalizeInvoiceNumber } from '@/lib/reconciliation/normalize'
import { reconcile } from '@/lib/reconciliation/index'
import { prisma } from '@/lib/db/prisma'
import type { ReconciliationOutcome, MatchLevel } from '@prisma/client'
import Decimal from 'decimal.js'

// ─── Helper: map engine outcome → DB MatchLevel ──────────────────────────────

export function matchOutcomeToMatchLevel(outcome: ReconciliationOutcome): MatchLevel {
  switch (outcome) {
    case 'AUTO_ACCEPTED':  return 'EXACT'
    case 'NOT_IN_BOOKS':   return 'NO_MATCH'
    case 'PENDING_REVIEW': return 'VALUE_TOLERANCE'
    default:               return 'SOFT_INVOICE'   // AUTO_REJECTED
  }
}

// ─── Counts returned to the caller ───────────────────────────────────────────

export interface ReconCounts {
  AUTO_ACCEPTED:  number
  AUTO_REJECTED:  number
  PENDING_REVIEW: number
  NOT_IN_BOOKS:   number
  total:          number
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function runReconciliation(uploadSessionId: string): Promise<ReconCounts> {
  // 1. Load ImsInvoice rows for this session
  const imsRows = await prisma.imsInvoice.findMany({
    where: { upload_session_id: uploadSessionId },
  })

  // 2. Load TallyEntry rows for this session
  const tallyRows = await prisma.tallyEntry.findMany({
    where: { upload_session_id: uploadSessionId },
  })

  // 3a. Build lookup: normalised invoiceNum → ImsInvoice.id
  //     (duplicate normalised keys will point to the first seen — engine dedupes anyway)
  const imsUuidByKey = new Map<string, string>()
  for (const row of imsRows) {
    const key = normalizeInvoiceNumber(row.invoice_number)
    if (!imsUuidByKey.has(key)) {
      imsUuidByKey.set(key, row.id)
    }
  }

  // 3b. Build lookup: normalised invoiceNum → TallyEntry.id
  const tallyUuidByInvoice = new Map<string, string>()
  for (const row of tallyRows) {
    const key = normalizeInvoiceNumber(row.voucher_number)
    if (!tallyUuidByInvoice.has(key)) {
      tallyUuidByInvoice.set(key, row.id)
    }
  }

  // 3c. Convert DB rows → NormalizedImsInvoice[]
  const imsNorm: NormalizedImsInvoice[] = imsRows.map(row => ({
    supplierGstin: row.supplier_gstin,
    invoiceNum:    row.invoice_number,
    invoiceDate:   row.invoice_date.toISOString().slice(0, 10),
    totalValue:    new Decimal(row.invoice_value),
    igst:          new Decimal(row.igst),
    cgst:          new Decimal(row.cgst),
    sgst:          new Decimal(row.sgst),
    pos:           row.place_of_supply ?? '',
  }))

  // 3d. Convert DB rows → NormalizedTallyRow[]
  const tallyNorm: NormalizedTallyRow[] = tallyRows.map(row => ({
    supplierGstin: row.supplier_gstin,
    supplierName:  row.supplier_name,
    invoiceNum:    row.voucher_number,
    invoiceDate:   row.voucher_date.toISOString().slice(0, 10),
    taxableValue:  new Decimal(row.taxable_value),
    igst:          new Decimal(row.igst),
    cgst:          new Decimal(row.cgst),
    sgst:          new Decimal(row.sgst),
    totalAmount:   new Decimal(row.total_amount),
  }))

  // 4. Run the reconciliation engine
  const results = reconcile(imsNorm, tallyNorm)

  // 5. Upsert each result — preserving is_done / done_at / done_by_id
  const upserts = results.map(r => {
    const normKey = normalizeInvoiceNumber(r.imsInvoiceNum)
    const imsUuid = imsUuidByKey.get(normKey)

    // If we somehow can't find the UUID, skip gracefully (should never happen)
    if (!imsUuid) return null

    const tallyUuid = r.matchedTallyInvoiceNum
      ? (tallyUuidByInvoice.get(normalizeInvoiceNumber(r.matchedTallyInvoiceNum)) ?? null)
      : null

    const outcome      = r.result as ReconciliationOutcome
    const matchLevel   = matchOutcomeToMatchLevel(outcome)
    const reasonCode   = outcome
    const reasonText   = r.reason ?? ''
    const itcAtRisk    = r.itcAtRisk.toFixed(2)

    return prisma.reconciliationResult.upsert({
      where: { ims_invoice_id: imsUuid },
      create: {
        ims_invoice_id: imsUuid,
        tally_entry_id: tallyUuid,
        match_level:    matchLevel,
        outcome,
        reason_code:    reasonCode,
        reason_text:    reasonText,
        itc_at_risk:    itcAtRisk,
        is_done:        false,
      },
      update: {
        // Update engine-derived fields but NEVER touch is_done / done_at / done_by_id
        tally_entry_id: tallyUuid,
        match_level:    matchLevel,
        outcome,
        reason_code:    reasonCode,
        reason_text:    reasonText,
        itc_at_risk:    itcAtRisk,
      },
    })
  }).filter((op): op is Exclude<typeof op, null> => op !== null)

  await prisma.$transaction(upserts)

  // 6. Mark the session as DONE
  await prisma.uploadSession.update({
    where: { id: uploadSessionId },
    data:  { status: 'DONE' },
  })

  // 7. Return counts by outcome
  const counts: ReconCounts = {
    AUTO_ACCEPTED:  0,
    AUTO_REJECTED:  0,
    PENDING_REVIEW: 0,
    NOT_IN_BOOKS:   0,
    total:          results.length,
  }
  for (const r of results) {
    counts[r.result]++
  }
  return counts
}
