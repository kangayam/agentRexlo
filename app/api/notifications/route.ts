import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { recipient_id: user.id },
    orderBy: { created_at: 'desc' },
    take: 50, // fetch more so dedup can select best 10
    select: {
      id: true,
      message: true,
      type: true,
      is_read: true,
      created_at: true,
      client_id: true,
    },
  })

  // Deduplicate: keep only the most recent notification per (type, message, client_id)
  const seen = new Set<string>()
  const deduped = notifications.filter(n => {
    const key = `${n.type}|${n.client_id ?? ''}|${n.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 10)

  const unreadCount = deduped.filter(n => !n.is_read).length

  return NextResponse.json({
    notifications: deduped.map(n => ({
      id: n.id,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      createdAt: n.created_at.toISOString(),
    })),
    unreadCount,
  })
}

export async function PATCH(request: Request) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { id?: string; all?: boolean }

  if (body.all) {
    await prisma.notification.updateMany({
      where: { recipient_id: user.id, is_read: false },
      data: { is_read: true },
    })
  } else if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, recipient_id: user.id },
      data: { is_read: true },
    })
  } else {
    return NextResponse.json({ error: 'Provide id or all' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
