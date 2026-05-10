import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function POST(
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
      { error: 'Only Admin users can archive clients.' },
      { status: 403 }
    )
  }

  const { clientId } = params

  const client = await prisma.client.findFirst({
    where: {
      id:          clientId,
      org_id:      user.org_id ?? '',
      archived_at: null,
    },
    select: { id: true, name: true },
  })

  if (!client) {
    return NextResponse.json(
      { error: 'Client not found or already archived.' },
      { status: 404 }
    )
  }

  const now = new Date()
  const scheduledDeleteAt = new Date(now)
  scheduledDeleteAt.setDate(scheduledDeleteAt.getDate() + 30)

  await prisma.client.update({
    where: { id: clientId },
    data: {
      archived_at:         now,
      archived_by_id:      user.id,
      scheduled_delete_at: scheduledDeleteAt,
    },
  })

  // Revoke portal access for all users linked to this client
  await prisma.user.updateMany({
    where: { client_id: clientId },
    data:  { is_active: false },
  })

  return NextResponse.json({
    success:            true,
    scheduledDeleteAt,
    message: `${client.name} archived. Data retained for 30 days.`,
  })
}
