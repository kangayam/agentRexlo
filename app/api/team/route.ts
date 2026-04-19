import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthedUser } from '@/lib/auth/session'
import { isInviteValid } from '@/lib/auth/invite'
import { sendTeamInviteEmail } from '@/lib/email/resend'
import { UserRole } from '@prisma/client'

// GET: list team members + pending invites
export async function GET() {
  const dbUser = await getAuthedUser()
  const [members, invites, org] = await Promise.all([
    prisma.user.findMany({
      where: { org_id: dbUser.org_id, id: { not: dbUser.id } },
      select: { id: true, name: true, email: true, role: true, created_at: true },
      orderBy: { created_at: 'asc' },
    }),
    prisma.teamInvite.findMany({
      where: { org_id: dbUser.org_id!, accepted_at: null },
      orderBy: { created_at: 'desc' },
    }),
    prisma.organization.findUnique({
      where: { id: dbUser.org_id! },
      select: { name: true },
    }),
  ])
  return NextResponse.json({ members, invites, currentUser: dbUser, orgName: org?.name })
}

// POST: invite / accept / resend
export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body as { action: string }
  const supabase = createServerClient()

  // Create invite (CA_ADMIN only)
  if (action === 'invite') {
    const dbUser = await getAuthedUser()
    if (dbUser.role !== UserRole.CA_ADMIN) {
      return NextResponse.json({ error: 'Only CA Admins can invite team members' }, { status: 403 })
    }
    const { email, role } = body as { email: string; role: UserRole }
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: dbUser.org_id! },
      select: { name: true },
    })
    const invite = await prisma.teamInvite.create({
      data: {
        org_id: dbUser.org_id!,
        email,
        role,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invited_by_id: dbUser.id,
      },
    })
    await sendTeamInviteEmail({ to: email, orgName: org.name, token: invite.token })
    return NextResponse.json({ invite })
  }

  // Accept invite: register new user with invite metadata; Supabase sends confirmation link
  if (action === 'accept') {
    const { token, name, password } = body as { token: string; name: string; password: string }
    const invite = await prisma.teamInvite.findUnique({ where: { token } })
    if (!invite || !isInviteValid(invite)) {
      return NextResponse.json({ error: 'This invitation is invalid or has expired.' }, { status: 400 })
    }
    const { error } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { name, inviteToken: token } },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ step: 'check-email', email: invite.email })
  }

  // Resend invite (CA_ADMIN only)
  if (action === 'resend') {
    const dbUser = await getAuthedUser()
    if (dbUser.role !== UserRole.CA_ADMIN) {
      return NextResponse.json({ error: 'Only CA Admins can resend invitations' }, { status: 403 })
    }
    const { inviteId } = body as { inviteId: string }
    const invite = await prisma.teamInvite.findUniqueOrThrow({
      where: { id: inviteId, org_id: dbUser.org_id! },
    })
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: dbUser.org_id! },
      select: { name: true },
    })
    const updated = await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })
    await sendTeamInviteEmail({ to: invite.email, orgName: org.name, token: updated.token })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// DELETE: revoke pending invite or remove team member (CA_ADMIN only)
export async function DELETE(request: Request) {
  const dbUser = await getAuthedUser()
  if (dbUser.role !== UserRole.CA_ADMIN) {
    return NextResponse.json({ error: 'Only CA Admins can remove team members' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('inviteId')
  const memberId = searchParams.get('memberId')

  if (inviteId) {
    await prisma.teamInvite.delete({ where: { id: inviteId, org_id: dbUser.org_id! } })
    return NextResponse.json({ ok: true })
  }

  if (memberId) {
    // Detach from org — does not delete the Supabase auth account
    await prisma.user.update({
      where: { id: memberId, org_id: dbUser.org_id! },
      data: { org_id: null },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Provide inviteId or memberId' }, { status: 400 })
}
