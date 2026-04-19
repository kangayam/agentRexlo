import { describe, it, expect } from 'vitest'
import { buildInviteEmailHtml } from '@/lib/email/resend'

describe('buildInviteEmailHtml', () => {
  it('includes the org name', () => {
    const html = buildInviteEmailHtml({ orgName: 'Demo CA', inviteUrl: 'https://example.com/accept' })
    expect(html).toContain('Demo CA')
  })

  it('includes the invite URL as a clickable link', () => {
    const html = buildInviteEmailHtml({ orgName: 'Demo CA', inviteUrl: 'https://example.com/accept' })
    expect(html).toContain('https://example.com/accept')
  })

  it('mentions 7 day expiry', () => {
    const html = buildInviteEmailHtml({ orgName: 'Demo CA', inviteUrl: 'https://example.com/accept' })
    expect(html).toContain('7 days')
  })
})
