import { prisma } from '@/lib/db/prisma'
import type { NotificationPayload } from './index'

export async function createInPlatformNotification(
  payload: NotificationPayload
): Promise<void> {
  // Deduplicate: skip if an identical notification already exists in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const existing = await prisma.notification.findFirst({
    where: {
      recipient_id: payload.recipientId,
      sender_id:    payload.senderId ?? null,
      client_id:    payload.clientId ?? null,
      type:         payload.type,
      created_at:   { gte: since },
    },
    select: { id: true },
  })
  if (existing) return

  await prisma.notification.create({
    data: {
      recipient_id: payload.recipientId,
      sender_id:    payload.senderId ?? null,
      client_id:    payload.clientId ?? null,
      type:         payload.type,
      message:      payload.message,
    },
  })
}
