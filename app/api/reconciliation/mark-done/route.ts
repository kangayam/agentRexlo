export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'

import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = await getEffectiveClientId()
  if (!clientId) return NextResponse.json({ error: 'No client context' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.resultId !== 'string' || typeof body.isDone !== 'boolean') {
    return NextResponse.json(
      { error: 'resultId (string) and isDone (boolean) are required' },
      { status: 400 },
    )
  }
  const { resultId, isDone } = body as { resultId: string; isDone: boolean }

  // For CA roles, verify their org owns the client they're acting as via cookie
  if (user.role !== 'CLIENT') {
    const clientOwned = await prisma.client.findUnique({
      where: { id: clientId, org_id: user.org_id ?? '' },
      select: { id: true },
    })
    if (!clientOwned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify ownership: result → ims_invoice → upload_session → client_gstin → client_id
  const result = await prisma.reconciliationResult.findUnique({
    where: { id: resultId },
    include: {
      ims_invoice: {
        include: {
          upload_session: { include: { client_gstin: { select: { client_id: true } } } },
        },
      },
    },
  })

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (result.ims_invoice.upload_session.client_gstin.client_id !== clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.reconciliationResult.update({
    where: { id: resultId },
    data: {
      is_done:    isDone,
      done_at:    isDone ? new Date() : null,
      done_by_id: isDone ? user.id : null,
    },
  })

  return NextResponse.json({
    resultId: updated.id,
    isDone:   updated.is_done,
    doneAt:   updated.done_at?.toISOString() ?? null,
  })
}
