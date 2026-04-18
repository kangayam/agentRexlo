import { createInPlatformNotification } from './in-platform'

export type NotificationPayload = {
  recipientId: string
  senderId?: string
  clientId?: string
  type: 'CA_NOTIFY_CLIENT' | 'CLIENT_COMPLETED' | 'CLIENT_UPLOADED' | 'UPLOAD_FAILED'
  message: string
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  await createInPlatformNotification(payload)
  // Phase 2: email/WhatsApp slots in here
}
