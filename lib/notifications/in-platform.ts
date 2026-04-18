import { prisma } from '@/lib/db/prisma'
import type { NotificationPayload } from './index'

export async function createInPlatformNotification(
  payload: NotificationPayload
): Promise<void> {
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
