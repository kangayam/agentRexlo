export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'

import { getAuthedUser } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'

import Decimal from 'decimal.js'
import { computeQualityScore } from '@/lib/quality-score'

function qualityBand(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 45) return 'Poor'
  return 'Critical'
}

export async function GET(
  _request: Request,
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

  const sessions = await prisma.uploadSession.findMany({
    where: { client_gstin: { client_id: clientId }, status: 'DONE' },
    orderBy: { period: 'desc' },
    select: { period: true },
    distinct: ['period'],
    take: 6,
  })
  const periods = sessions.map(s => s.period).reverse()

  const periodData = await Promise.all(periods.map(async period => {
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

    let itcInBooks  = new Decimal(0)
    let itcCleared  = new Decimal(0)
    let total       = 0
    let autoAcc     = 0
    let nonAuto     = 0
    let doneNonAuto = 0

    for (const r of results) {
      total++
      const itc = new Decimal(r.ims_invoice.igst).plus(r.ims_invoice.cgst).plus(r.ims_invoice.sgst)
      itcInBooks = itcInBooks.plus(itc)
      if (r.outcome === 'AUTO_ACCEPTED') { autoAcc++; itcCleared = itcCleared.plus(itc) }
      else { nonAuto++; if (r.is_done) doneNonAuto++ }
    }

    const { qualityScore: score, qualityBand: band } = computeQualityScore(
      results.map(r => ({
        outcome: r.outcome as 'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS',
        igst:    parseFloat(r.ims_invoice.igst),
        cgst:    parseFloat(r.ims_invoice.cgst),
        sgst:    parseFloat(r.ims_invoice.sgst),
      }))
    )

    const [yyyy, mm] = period.split('-')
    const label = new Date(Number(yyyy), Number(mm) - 1, 1)
      .toLocaleString('en-IN', { month: 'short', year: '2-digit' })

    const leakagePct = itcInBooks.gt(0)
      ? Math.round(itcInBooks.minus(itcCleared).div(itcInBooks).toNumber() * 100)
      : 0

    return { period, label, itcInBooks: itcInBooks.toFixed(2), itcCleared: itcCleared.toFixed(2), score, band, leakagePct }
  }))

  return NextResponse.json({ periods: periodData })
}
