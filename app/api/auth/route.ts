export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/supabase/server'


export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body as { action: string }
  const supabase = await createServerClient()

  // Sign up: register email + password + metadata; Supabase sends confirmation link
  if (action === 'signup') {
    const { email, password, name, orgName } = body as {
      email: string; password: string; name: string; orgName: string
    }
    const origin = new URL(request.url).origin
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, orgName },
        emailRedirectTo: `${origin}/auth/callback?next=/ca/dashboard`,
      },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ step: 'check-email' })
  }

  // Login: validate credentials, return redirect based on role
  if (action === 'login') {
    const { email, password } = body as { email: string; password: string }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    const { prisma } = await import('@/lib/db/prisma')
    let dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { role: true },
    })

    // Prisma user missing — create it now from Supabase metadata.
    // This handles the case where signUp succeeded but the Prisma record was never written
    // (e.g. email confirmation was enabled and the auth callback never ran).
    if (!dbUser) {
      const meta = (data.user.user_metadata ?? {}) as Record<string, string>

      // Try to find the client by contact_email — more reliable than the stale
      // invite token in metadata (which may have been rotated since signup).
      const client = await prisma.client.findFirst({
        where: { contact_email: email },
        select: { id: true },
      })

      if (client) {
        await prisma.user.create({
          data: {
            id:        data.user.id,
            name:      meta.name ?? email,
            email,
            role:      'CLIENT',
            client_id: client.id,
          },
        })
        // Clear any pending invite token since the account is now active
        await prisma.client.update({
          where: { id: client.id },
          data: { invite_token: null, invite_expires_at: null },
        })
        dbUser = { role: 'CLIENT' }
      }

      if (!dbUser) {
        return NextResponse.json(
          { error: 'Account setup incomplete. Please contact your CA to resend the invite.' },
          { status: 403 },
        )
      }
    }

    const redirectTo = dbUser.role === 'CLIENT' ? '/client/dashboard' : '/ca/dashboard'
    const res = NextResponse.json({ redirectTo })
    return res
  }

  // Reset request: send password-reset email (always 200 to prevent enumeration)
  if (action === 'reset-request') {
    const { email } = body as { email: string }
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset`,
    })
    return NextResponse.json({ ok: true })
  }

  // Reset confirm: set new password (requires active recovery session from callback)
  if (action === 'reset-confirm') {
    const { password } = body as { password: string }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ redirectTo: '/login' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
