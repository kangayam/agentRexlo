import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { AppSidebar } from '@/components/nav/AppSidebar'
import { WelcomeHeader } from '@/components/WelcomeHeader'
import { InactivityWarning } from '@/components/InactivityWarning'

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

  // Count clients with at least one pending (not done, non-AUTO_ACCEPTED) result
  const alertCount = user.org_id
    ? await prisma.client.count({
        where: {
          org_id: user.org_id,
          gstins: {
            some: {
              upload_sessions: {
                some: {
                  ims_invoices: {
                    some: {
                      reconciliation_result: {
                        is: { outcome: { not: 'AUTO_ACCEPTED' }, is_done: false },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : 0

  const CA_NAV = [
    { label: 'Dashboard', href: '/ca/dashboard', icon: 'LayoutDashboard' as const },
    { label: 'Clients',   href: '/ca/clients',   icon: 'Users'           as const },
    { label: 'Analytics', href: '/ca/analytics', icon: 'BarChart2'       as const },
    { label: 'Alerts',    href: '/ca/alerts',    icon: 'Bell'            as const, badge: alertCount > 0 ? alertCount : undefined },
    { label: 'Team',      href: '/ca/team',      icon: 'UserCheck'       as const },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        navItems={CA_NAV}
        userName={user.name}
        userEmail={user.email}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <WelcomeHeader userName={user.name} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <InactivityWarning />
    </div>
  )
}
