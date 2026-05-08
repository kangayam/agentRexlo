export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'

import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = await getEffectiveClientId()
  if (!clientId) return NextResponse.json({ error: 'No client context' }, { status: 403 })

  const sessions = await prisma.uploadSession.findMany({
    where: { client_gstin: { client_id: clientId } },
    include: {
      client_gstin: { select: { gstin: true } },
      uploaded_by:  { select: { name: true } },
      ims_invoices: {
        select: {
          reconciliation_result: { select: { outcome: true } },
        },
      },
    },
    orderBy: [{ period: 'desc' }, { created_at: 'desc' }],
  })

  const fmt = (d: Date | null) =>
    d?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) ?? null

  const periods = sessions.map(s => {
    const outcomes = s.ims_invoices
      .map(i => i.reconciliation_result?.outcome)
      .filter(Boolean) as string[]
    return {
      period:          s.period,
      gstin:           s.client_gstin.gstin,
      status:          s.status.toLowerCase(),
      imsUploadedAt:   fmt(s.ims_uploaded_at),
      tallyUploadedAt: fmt(s.tally_uploaded_at),
      uploadedBy:      s.uploaded_by.name,
      matched:         outcomes.filter(o => o === 'AUTO_ACCEPTED').length,
      rejected:        outcomes.filter(o => o === 'AUTO_REJECTED').length,
      review:          outcomes.filter(o => o === 'PENDING_REVIEW').length,
      notInBooks:      outcomes.filter(o => o === 'NOT_IN_BOOKS').length,
    }
  })

  return NextResponse.json(periods)
}
