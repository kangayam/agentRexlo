import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: Request) {
  const { token, name, password } = await request.json() as {
    token: string
    name: string
    password: string
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
  const { error } = await supabase.auth.signUp({
    email: client.contact_email,
    password,
    options: {
      data: { name, clientInviteToken: token },
      emailRedirectTo: `${origin}/auth/callback?next=/client/dashboard`,
    },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ email: client.contact_email })
}
