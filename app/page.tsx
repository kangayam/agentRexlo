import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { Nav }         from '@/components/landing/Nav'
import { Hero }        from '@/components/landing/Hero'
import { Problem }     from '@/components/landing/Problem'
import { Solution }    from '@/components/landing/Solution'
import { Screenshots } from '@/components/landing/Screenshots'
import { Economics }   from '@/components/landing/Economics'
import { HowToStart }  from '@/components/landing/HowToStart'
import { FinalCTA }    from '@/components/landing/FinalCTA'
import { Footer }      from '@/components/landing/Footer'

export default async function Home() {
  // Redirect authenticated users to their respective dashboards
  try {
    const user = await getAuthedUser()
    if (user.role === 'CLIENT') redirect('/client/dashboard')
    redirect('/ca/dashboard')
  } catch {
    // Not authenticated — fall through and render the landing page
  }

  return (
    <main>
      <Nav />
      <Hero />
      <Problem />
      <Solution />
      <Screenshots />
      <Economics />
      <HowToStart />
      <FinalCTA />
      <Footer />
    </main>
  )
}
