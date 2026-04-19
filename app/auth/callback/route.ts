import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectTo = `${origin}${next}`
      // Append mode=confirm for the reset password page so it knows to show the new-password form
      if (next === '/reset') {
        return NextResponse.redirect(`${redirectTo}?mode=confirm`)
      }
      return NextResponse.redirect(redirectTo)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
