import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { computeSummaryCards } from '@/lib/dashboard/client'
import type { ReconRow } from '@/lib/dashboard/client'

export async function GET(req: NextRequest) {
  try {
    await getAuthedUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = await getEffectiveClientId()
  if (!clientId) return NextResponse.json({ error: 'No client context' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  let period = searchParams.get('period') ?? null

  if (!period) {
    const latest = await prisma.uploadSession.findFirst({
      where: { client_gstin: { client_id: clientId }, status: 'DONE' },
      orderBy: { period: 'desc' },
      select: { period: true },
    })
    if (!latest) return NextResponse.json({ period: null, summaryCards: null, rows: [] })
    period = latest.period
  }

  const results = await prisma.reconciliationResult.findMany({
    where: {
      ims_invoice: {
        upload_session: {
          client_gstin: { client_id: clientId },
          period,
          status: 'DONE',
        },
      },
    },
    include: { ims_invoice: true },
  })

  const rows: ReconRow[] = results.map(r => ({
    resultId:      r.id,
    supplierGstin: r.ims_invoice.supplier_gstin,
    invoiceNumber: r.ims_invoice.invoice_number,
    invoiceDate:   r.ims_invoice.invoice_date.toISOString().slice(0, 10),
    taxableValue:  r.ims_invoice.taxable_value,
    igst:          r.ims_invoice.igst,
    cgst:          r.ims_invoice.cgst,
    sgst:          r.ims_invoice.sgst,
    itcAtRisk:     r.itc_at_risk,
    matchOutcome:  r.outcome,
    reasonCode:    r.reason_code,
    isDone:        r.is_done,
    doneAt:        r.done_at?.toISOString() ?? null,
  }))

  rows.sort((a, b) => parseFloat(b.itcAtRisk) - parseFloat(a.itcAtRisk))

  return NextResponse.json({ period, summaryCards: computeSummaryCards(rows), rows })
}
