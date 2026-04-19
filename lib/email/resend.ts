import { Resend } from 'resend'

export function buildInviteEmailHtml({
  orgName,
  inviteUrl,
}: {
  orgName: string
  inviteUrl: string
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#0f172a;">You've been invited to join ${orgName} on AgentFlow</h2>
      <p style="color:#334155;">Click the button below to accept your invitation and set up your account.</p>
      <a href="${inviteUrl}"
         style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
        Accept Invitation
      </a>
      <p style="color:#94a3b8;font-size:14px;margin-top:24px;">
        This link expires in 7 days. If you did not expect this invitation, you can ignore this email.
      </p>
    </div>
  `
}

export async function sendTeamInviteEmail({
  to,
  orgName,
  token,
}: {
  to: string
  orgName: string
  token: string
}): Promise<void> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}`
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `You've been invited to join ${orgName} on AgentFlow`,
    html: buildInviteEmailHtml({ orgName, inviteUrl }),
  })
}
