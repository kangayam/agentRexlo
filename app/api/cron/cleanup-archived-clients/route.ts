import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const toDelete = await prisma.client.findMany({
    where: {
      archived_at:         { not: null },
      scheduled_delete_at: { lte: now },
    },
    select: { id: true, name: true },
  })

  const results = []
  for (const client of toDelete) {
    try {
      const gstins = await prisma.clientGstin.findMany({
        where:  { client_id: client.id },
        select: { id: true },
      })
      const gstinIds   = gstins.map(g => g.id)
      const sessions   = await prisma.uploadSession.findMany({
        where:  { client_gstin_id: { in: gstinIds } },
        select: { id: true },
      })
      const sessionIds = sessions.map(s => s.id)

      const invoices = await prisma.imsInvoice.findMany({
        where:  { upload_session_id: { in: sessionIds } },
        select: { id: true },
      })
      await prisma.reconciliationResult.deleteMany({
        where: { ims_invoice_id: { in: invoices.map(i => i.id) } },
      })
      await prisma.imsInvoice.deleteMany({
        where: { upload_session_id: { in: sessionIds } },
      })
      await prisma.tallyEntry.deleteMany({
        where: { upload_session_id: { in: sessionIds } },
      })
      await prisma.uploadSession.deleteMany({
        where: { id: { in: sessionIds } },
      })
      await prisma.clientGstin.deleteMany({
        where: { client_id: client.id },
      })
      await prisma.notification.deleteMany({
        where: { client_id: client.id },
      })
      await prisma.user.deleteMany({
        where: { client_id: client.id },
      })
      await prisma.client.delete({
        where: { id: client.id },
      })

      results.push({ clientId: client.id, name: client.name, status: 'deleted' })
    } catch (err) {
      results.push({ clientId: client.id, name: client.name, status: 'error', error: String(err) })
    }
  }

  return NextResponse.json({
    processed: toDelete.length,
    results,
    timestamp: now.toISOString(),
  })
}
