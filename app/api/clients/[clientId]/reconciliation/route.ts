export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'

import { getAuthedUser } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'

import { computeSummaryCards } from '@/lib/dashboard/client'

import type { ReconRow } from '@/lib/dashboard/client'

import Decimal from 'decimal.js'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const client = await prisma.client.findUnique({
    where: { id: clientId, org_id: user.org_id },
    select: { id: true },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const periodParam = searchParams.get('period')

  const sessions = await prisma.uploadSession.findMany({
    where: { client_gstin: { client_id: clientId }, status: 'DONE' },
    orderBy: { period: 'desc' },
    select: { period: true },
    distinct: ['period'],
  })
  const periods = sessions.map(s => s.period)
  const period = periodParam ?? periods[0] ?? null

  let rows: ReconRow[] = []

  if (period) {
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

    rows = results.map(r => ({
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

    rows.sort((a, b) => new Decimal(b.itcAtRisk).minus(a.itcAtRisk).toNumber())
  }

  return NextResponse.json({ rows, summary: computeSummaryCards(rows), period, periods })
}
