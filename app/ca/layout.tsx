import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { AppSidebar } from '@/components/nav/AppSidebar'

const CA_NAV = [
  { label: 'Dashboard', href: '/ca/dashboard' },
  { label: 'Clients',   href: '/ca/clients' },
  { label: 'Team',      href: '/ca/team' },
]

export default async function CaLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  if (user.role === 'CLIENT') {
    redirect('/client/dashboard')
    return
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        navItems={CA_NAV}
        userName={user.name}
        userEmail={user.email}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
