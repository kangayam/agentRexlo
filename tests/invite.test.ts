import { describe, it, expect } from 'vitest'
import { isInviteValid } from '@/lib/auth/invite'

const base = {
  id: 'inv-1',
  org_id: 'org-1',
  email: 'staff@example.com',
  role: 'CA_STAFF' as const,
  token: 'tok-1',
  invited_by_id: 'user-1',
  created_at: new Date(),
}

describe('isInviteValid', () => {
  it('returns true for a fresh, unaccepted invite', () => {
    const invite = { ...base, accepted_at: null, expires_at: new Date(Date.now() + 86_400_000) }
    expect(isInviteValid(invite)).toBe(true)
  })

  it('returns false for an expired invite', () => {
    const invite = { ...base, accepted_at: null, expires_at: new Date(Date.now() - 1000) }
    expect(isInviteValid(invite)).toBe(false)
  })

  it('returns false for an already-accepted invite', () => {
    const invite = { ...base, accepted_at: new Date(), expires_at: new Date(Date.now() + 86_400_000) }
    expect(isInviteValid(invite)).toBe(false)
  })
})
