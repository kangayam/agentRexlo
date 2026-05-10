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
      { error: 'Only Admin users can restore clients.' },
      { status: 403 }
    )
  }

  const { clientId } = params

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
      { error: 'Client not found or not archived.' },
      { status: 404 }
    )
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      archived_at:         null,
      archived_by_id:      null,
      scheduled_delete_at: null,
    },
  })

  await prisma.user.updateMany({
    where: { client_id: clientId },
    data:  { is_active: true },
  })

  return NextResponse.json({
    success: true,
    message: `${client.name} has been restored successfully.`,
  })
}
