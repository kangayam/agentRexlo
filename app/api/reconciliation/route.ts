export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'

import { getAuthedUser } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'

import { runReconciliation } from '@/lib/reconciliation/run'

// ─── POST /api/reconciliation ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { sessionId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sessionId } = body
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  // Find session and verify access
  const session = await prisma.uploadSession.findUnique({
    where: { id: sessionId },
    include: {
      client_gstin: {
        include: { client: true },
      },
    },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const orgId = session.client_gstin.client.org_id
  const clientId = session.client_gstin.client_id

  // CA roles: must belong to the same org
  if (
    (user.role === 'CA_ADMIN' || user.role === 'CA_STAFF') &&
    user.org_id !== orgId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // CLIENT role: must be linked to this client
  if (user.role === 'CLIENT' && user.client_id !== clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate both uploads are present
  if (!session.ims_uploaded_at || !session.tally_uploaded_at) {
    return NextResponse.json(
      {
        error: 'Both IMS and Tally files must be uploaded before reconciliation',
        imsUploaded: !!session.ims_uploaded_at,
        tallyUploaded: !!session.tally_uploaded_at,
      },
      { status: 422 }
    )
  }

  // Run reconciliation
  let counts: Awaited<ReturnType<typeof runReconciliation>>
  try {
    counts = await runReconciliation(sessionId)
  } catch (err) {
    console.error('[reconciliation] runReconciliation failed:', err)
    return NextResponse.json(
      { error: 'Reconciliation failed', detail: String(err) },
      { status: 500 }
    )
  }

  return NextResponse.json({
    sessionId,
    outcomes: {
      AUTO_ACCEPTED: counts.AUTO_ACCEPTED,
      AUTO_REJECTED: counts.AUTO_REJECTED,
      PENDING_REVIEW: counts.PENDING_REVIEW,
      NOT_IN_BOOKS: counts.NOT_IN_BOOKS,
      total: counts.total,
    },
  })
}
