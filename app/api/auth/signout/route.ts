import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('actingAsClientId')

  return NextResponse.json({ ok: true })
}
