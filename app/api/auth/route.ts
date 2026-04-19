import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body as { action: string }
  const supabase = createServerClient()

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
    const dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { role: true },
    })
    const redirectTo = dbUser?.role === 'CLIENT' ? '/client/dashboard' : '/ca/dashboard'
    return NextResponse.json({ redirectTo })
  }

  // Reset request: send password-reset email (always 200 to prevent enumeration)
  if (action === 'reset-request') {
    const { email } = body as { email: string }
    const origin = new URL(request.url).origin
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
