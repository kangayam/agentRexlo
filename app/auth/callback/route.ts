import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // On first login, create Prisma records from user metadata
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const existing = await prisma.user.findUnique({ where: { id: user.id } })
        if (!existing) {
          const meta = (user.user_metadata ?? {}) as Record<string, string>
          if (meta.inviteToken) {
            // Team invite acceptance path
            const invite = await prisma.teamInvite.findUnique({ where: { token: meta.inviteToken } })
            if (invite && invite.accepted_at === null) {
              await prisma.$transaction([
                prisma.user.create({
                  data: {
                    id: user.id,
                    name: meta.name ?? user.email!,
                    email: user.email!,
                    role: invite.role,
                    org_id: invite.org_id,
                  },
                }),
                prisma.teamInvite.update({
                  where: { id: invite.id },
                  data: { accepted_at: new Date() },
                }),
              ])
            }
          } else if (meta.orgName) {
            // New CA Admin signup path
            const orgId = crypto.randomUUID()
            await prisma.$transaction([
              prisma.organization.create({ data: { id: orgId, name: meta.orgName } }),
              prisma.user.create({
                data: {
                  id: user.id,
                  name: meta.name ?? user.email!,
                  email: user.email!,
                  role: 'CA_ADMIN',
                  org_id: orgId,
                },
              }),
            ])
          }
        }
      }

      const redirectTo = `${origin}${next}`
      if (next === '/reset') {
        return NextResponse.redirect(`${redirectTo}?mode=confirm`)
      }
      return NextResponse.redirect(redirectTo)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
