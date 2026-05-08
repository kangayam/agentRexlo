import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refreshes the Supabase session token so Server Components get fresh cookies.
  // Wrapped in a race so a slow/unreachable Supabase API never blocks page loads.
  await Promise.race([
    supabase.auth.getUser(),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ])

  return supabaseResponse
}

export const config = {
  // Exclude API routes — they do their own auth via getAuthedUser().
  // Exclude static assets and public auth pages.
  matcher: [
    '/ca/:path*',
    '/client/:path*',
  ],
}
