import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { Nav }         from '@/components/landing/Nav'
import { Hero }        from '@/components/landing/Hero'
import { TrustedBy }   from '@/components/landing/TrustedBy'
import { WhoItsFor }   from '@/components/landing/WhoItsFor'
import { StatsBar }    from '@/components/landing/StatsBar'
import { FourModules }      from '@/components/landing/FourModules'
import { AgenticAdvantage } from '@/components/landing/AgenticAdvantage'
import { Screenshots }      from '@/components/landing/Screenshots'
import { Pricing }     from '@/components/landing/Pricing'
import { FinalCTA }    from '@/components/landing/FinalCTA'
import { Footer }      from '@/components/landing/Footer'

export default async function Home() {
  try {
    const user = await getAuthedUser()
    if (user.role === 'CLIENT') redirect('/client/dashboard')
    redirect('/ca/dashboard')
  } catch {
    // Not authenticated — render landing page
  }

  return (
    <main>
      <Nav />
      <Hero />
      <TrustedBy />
      <WhoItsFor />
      <StatsBar />
      <FourModules />
      <AgenticAdvantage />
      <Screenshots />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  )
}
