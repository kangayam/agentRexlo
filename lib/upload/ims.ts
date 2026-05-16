import { prisma } from '@/lib/db/prisma'
import type { ParsedIMSInvoice } from '@/lib/parsers/ims-json-parser'

function imsKey(supplierGstin: string, invoiceNumber: string): string {
  return `${supplierGstin.toUpperCase()}::${invoiceNumber}`
}

/**
 * Additive IMS upload: preserves existing ImsInvoice rows (and their
 * ReconciliationResult.is_done flags) when the same supplier+invoice# is
 * re-uploaded. Only truly stale rows (present before, absent now) are deleted.
 *
 * Duplicate-handling: two occurrences of the same supplier+invoice# in `parsed`
 * each consume one existing row slot (FIFO), so duplicate detection in the
 * reconciliation engine continues to work correctly.
 */
export async function replaceImsInvoices(
  sessionId: string,
  parsed: ParsedIMSInvoice[]
): Promise<void> {
  const existing = await prisma.imsInvoice.findMany({
    where: { upload_session_id: sessionId },
    select: { id: true, supplier_gstin: true, invoice_number: true },
  })

  // Map: "GSTIN::invoice#" → ordered queue of existing row IDs.
  // Queue depth > 1 covers the duplicate-invoice scenario.
  const existingByKey = new Map<string, string[]>()
  for (const row of existing) {
    const key = imsKey(row.supplier_gstin, row.invoice_number)
    const queue = existingByKey.get(key) ?? []
    queue.push(row.id)
    existingByKey.set(key, queue)
  }

  // Match each new invoice to an existing row (FIFO per key).
  const reusedIds = new Set<string>()
  const toUpdate: { id: string; inv: ParsedIMSInvoice }[] = []
  const toCreate: ParsedIMSInvoice[] = []

  for (const inv of parsed) {
    const key = imsKey(inv.supplierGstin, inv.invoiceNo)
    const queue = existingByKey.get(key)
    if (queue && queue.length > 0) {
      const id = queue.shift()!
      reusedIds.add(id)
      toUpdate.push({ id, inv })
    } else {
      toCreate.push(inv)
    }
  }

  // Stale rows: were in the session before but are not in the new upload.
  const toDeleteIds = existing.map(e => e.id).filter(id => !reusedIds.has(id))
  if (toDeleteIds.length > 0) {
    await prisma.reconciliationResult.deleteMany({
      where: { ims_invoice_id: { in: toDeleteIds } },
    })
    await prisma.imsInvoice.deleteMany({
      where: { id: { in: toDeleteIds } },
    })
  }

  // Update matched rows in-place — same DB row ID keeps the ReconciliationResult
  // FK alive, so is_done / done_at / done_by_id survive the re-upload.
  await Promise.all(
    toUpdate.map(({ id, inv }) =>
      prisma.imsInvoice.update({
        where: { id },
        data: {
          supplier_gstin:  inv.supplierGstin,
          invoice_number:  inv.invoiceNo,
          invoice_date:    inv.invoiceDate ?? new Date(0),
          invoice_value:   inv.totalValue.toFixed(2),
          taxable_value:   inv.taxableValue.toFixed(2),
          igst:            inv.igst.toFixed(2),
          cgst:            inv.cgst.toFixed(2),
          sgst:            inv.sgst.toFixed(2),
          place_of_supply: inv.pos ?? null,
        },
      })
    )
  )

  // Create genuinely new invoices (no existing row to reuse).
  if (toCreate.length > 0) {
    await prisma.imsInvoice.createMany({
      data: toCreate.map(inv => ({
        upload_session_id: sessionId,
        supplier_gstin:    inv.supplierGstin,
        supplier_name:     null,
        invoice_number:    inv.invoiceNo,
        invoice_date:      inv.invoiceDate ?? new Date(0),
        invoice_value:     inv.totalValue.toFixed(2),
        taxable_value:     inv.taxableValue.toFixed(2),
        igst:              inv.igst.toFixed(2),
        cgst:              inv.cgst.toFixed(2),
        sgst:              inv.sgst.toFixed(2),
        place_of_supply:   inv.pos ?? null,
        ims_action:        'PENDING' as const,
      })),
    })
  }
}
