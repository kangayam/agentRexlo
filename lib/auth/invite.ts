import type { TeamInvite } from '@prisma/client'

export function isInviteValid(invite: Pick<TeamInvite, 'accepted_at' | 'expires_at'>): boolean {
  return invite.accepted_at === null && invite.expires_at > new Date()
}
