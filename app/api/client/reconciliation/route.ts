export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'

import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    if (!latest) return NextResponse.json({ period: null, gstin: null, results: [] })
    period = latest.period
  }

  const session = await prisma.uploadSession.findFirst({
    where: { client_gstin: { client_id: clientId }, period, status: 'DONE' },
    select: { client_gstin: { select: { gstin: true } } },
  })

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

  const rows = results
    .map(r => ({
      id:            r.id,
      result:        r.outcome,
      reasonCode:    r.reason_code,
      supplierGstin: r.ims_invoice.supplier_gstin,
      invoiceNo:     r.ims_invoice.invoice_number,
      invoiceDate:   r.ims_invoice.invoice_date.toISOString().slice(0, 10),
      igst:          parseFloat(r.ims_invoice.igst),
      cgst:          parseFloat(r.ims_invoice.cgst),
      sgst:          parseFloat(r.ims_invoice.sgst),
      itcAtRisk:     parseFloat(r.itc_at_risk),
      isDone:        r.is_done,
    }))
    .sort((a, b) => b.itcAtRisk - a.itcAtRisk)

  return NextResponse.json({
    period,
    gstin: session?.client_gstin.gstin ?? null,
    results: rows,
  })
}
