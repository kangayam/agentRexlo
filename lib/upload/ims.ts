import { prisma } from '@/lib/db/prisma'
import type { ParsedIMSInvoice } from '@/lib/parsers/ims-json-parser'

/**
 * Replace-all IMS upload: deletes existing IMS invoices and their reconciliation
 * results for the session, then inserts the fresh set from the new file.
 *
 * Delete order matters: ReconciliationResult → ImsInvoice (FK constraint).
 */
export async function replaceImsInvoices(
  sessionId: string,
  parsed: ParsedIMSInvoice[]
): Promise<void> {
  const existing = await prisma.imsInvoice.findMany({
    where: { upload_session_id: sessionId },
    select: { id: true },
  })

  if (existing.length > 0) {
    const ids = existing.map(e => e.id)
    await prisma.reconciliationResult.deleteMany({
      where: { ims_invoice_id: { in: ids } },
    })
  }

  await prisma.imsInvoice.deleteMany({
    where: { upload_session_id: sessionId },
  })

  if (parsed.length > 0) {
    await prisma.imsInvoice.createMany({
      data: parsed.map(inv => ({
        upload_session_id: sessionId,
        supplier_gstin: inv.supplierGstin,
        supplier_name: null,
        invoice_number: inv.invoiceNo,
        invoice_date: inv.invoiceDate ?? new Date(0),
        invoice_value: inv.totalValue.toFixed(2),
        taxable_value: inv.taxableValue.toFixed(2),
        igst: inv.igst.toFixed(2),
        cgst: inv.cgst.toFixed(2),
        sgst: inv.sgst.toFixed(2),
        place_of_supply: inv.pos ?? null,
        ims_action: 'PENDING' as const,
      })),
    })
  }
}
