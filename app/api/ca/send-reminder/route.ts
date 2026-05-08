export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'

import { getAuthedUser } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'

import { sendNotification } from '@/lib/notifications/index'

export async function POST(req: NextRequest) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'CA_ADMIN' && user.role !== 'CA_STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!user.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.clientId !== 'string') {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }
  const { clientId } = body as { clientId: string }

  const client = await prisma.client.findUnique({
    where: { id: clientId, org_id: user.org_id },
    include: { users: { select: { id: true } } },
  })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Stamp reminder time on the client record
  await prisma.client.update({
    where: { id: clientId },
    data: { last_reminded_at: new Date() },
  })

  // Notify each client user
  await Promise.all(
    client.users.map(recipient =>
      sendNotification({
        recipientId: recipient.id,
        senderId:    user.id,
        clientId:    client.id,
        type:        'CA_NOTIFY_CLIENT',
        message:     'Your CA has sent you a reminder to review your IMS action queue.',
      }),
    ),
  )

  return NextResponse.json({ ok: true })
}
