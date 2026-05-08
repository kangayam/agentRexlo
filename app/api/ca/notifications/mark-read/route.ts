export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'

import { getAuthedUser } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'


export async function POST() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.notification.updateMany({
    where: { recipient_id: user.id, is_read: false },
    data: { is_read: true },
  })

  return NextResponse.json({ ok: true })
}
