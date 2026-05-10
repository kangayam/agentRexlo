import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'CA_ADMIN') {
    return NextResponse.json(
      { error: 'Only Admin users can permanently delete clients.' },
      { status: 403 }
    )
  }

  const { clientId } = params

  // Must be archived before permanent delete
  const client = await prisma.client.findFirst({
    where: {
      id:          clientId,
      org_id:      user.org_id ?? '',
      archived_at: { not: null },
    },
    select: { id: true, name: true },
  })

  if (!client) {
    return NextResponse.json(
      { error: 'Client must be archived before permanent deletion.' },
      { status: 400 }
    )
  }

  // ── Cascade delete in FK order ────────────────────────────────────────────────
  // 1. Find all upload sessions via ClientGstin
  const gstins = await prisma.clientGstin.findMany({
    where:  { client_id: clientId },
    select: { id: true },
  })
  const gstinIds    = gstins.map(g => g.id)
  const sessions    = await prisma.uploadSession.findMany({
    where:  { client_gstin_id: { in: gstinIds } },
    select: { id: true },
  })
  const sessionIds  = sessions.map(s => s.id)

  // 2. ReconciliationResults (via ImsInvoice)
  const invoices = await prisma.imsInvoice.findMany({
    where:  { upload_session_id: { in: sessionIds } },
    select: { id: true },
  })
  const invoiceIds = invoices.map(i => i.id)
  await prisma.reconciliationResult.deleteMany({
    where: { ims_invoice_id: { in: invoiceIds } },
  })

  // 3. ImsInvoices + TallyEntries
  await prisma.imsInvoice.deleteMany({
    where: { upload_session_id: { in: sessionIds } },
  })
  await prisma.tallyEntry.deleteMany({
    where: { upload_session_id: { in: sessionIds } },
  })

  // 4. UploadSessions
  await prisma.uploadSession.deleteMany({
    where: { id: { in: sessionIds } },
  })

  // 5. ClientGstins
  await prisma.clientGstin.deleteMany({
    where: { client_id: clientId },
  })

  // 6. Notifications linked to this client
  await prisma.notification.deleteMany({
    where: { client_id: clientId },
  })

  // 7. Client user accounts
  await prisma.user.deleteMany({
    where: { client_id: clientId },
  })

  // 8. Client itself
  await prisma.client.delete({
    where: { id: clientId },
  })

  return NextResponse.json({
    success: true,
    message: `${client.name} and all related data permanently deleted.`,
  })
}
