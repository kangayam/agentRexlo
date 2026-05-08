export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/supabase/server'

import { prisma } from '@/lib/db/prisma'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { token, name, password } = body as { token?: unknown; name?: unknown; password?: unknown }

  if (!token || typeof token !== 'string' ||
      !name   || typeof name   !== 'string' ||
      !password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const client = await prisma.client.findUnique({
    where: { invite_token: token },
    select: { id: true, contact_email: true, invite_expires_at: true },
  })
  if (!client || !client.invite_expires_at || client.invite_expires_at < new Date()) {
    return NextResponse.json({ error: 'This invitation is invalid or has expired.' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const supabase = await createServerClient()
  const { data, error: authError } = await supabase.auth.signUp({
    email: client.contact_email,
    password,
    options: {
      data: { name, clientInviteToken: token },
      emailRedirectTo: `${origin}/auth/callback?next=/client/dashboard`,
    },
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // If Supabase email confirmation is disabled, signUp returns a session immediately.
  // In that case, create the Prisma user record now and clear the invite token.
  if (data.session && data.user) {
    const existing = await prisma.user.findUnique({ where: { id: data.user.id } })
    if (!existing) {
      await prisma.$transaction([
        prisma.user.create({
          data: {
            id:        data.user.id,
            name:      name as string,
            email:     client.contact_email,
            role:      'CLIENT',
            client_id: client.id,
          },
        }),
        prisma.client.update({
          where: { id: client.id },
          data: { invite_token: null, invite_expires_at: null },
        }),
      ])
    }
    // Tell the page to redirect directly to the dashboard
    return NextResponse.json({ email: client.contact_email, redirect: '/client/dashboard' })
  }

  // Email confirmation is enabled — user must click the Supabase confirmation email.
  // Token is cleared in auth/callback after the user verifies.
  return NextResponse.json({ email: client.contact_email })
}
