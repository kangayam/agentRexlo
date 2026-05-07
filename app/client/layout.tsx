import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { getAuthedUser } from '@/lib/auth/session'
import { ActingAsBanner } from '@/components/acting-as-banner'
import { AppSidebar } from '@/components/nav/AppSidebar'
import { WelcomeHeader } from '@/components/WelcomeHeader'
import { InactivityWarning } from '@/components/InactivityWarning'
const CLIENT_NAV = [
  { label: 'Dashboard', href: '/client/dashboard', icon: 'LayoutDashboard' as const },
  { label: 'Upload',    href: '/client/upload',    icon: 'Upload'          as const },
  { label: 'History',   href: '/client/history',   icon: 'Clock'           as const },
]

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  const cookieStore = await cookies()
  const actingAsClientId = cookieStore.get('actingAsClientId')?.value ?? null

  // CA users must be acting-as a client to access the client portal
  if ((user.role === 'CA_ADMIN' || user.role === 'CA_STAFF') && !actingAsClientId) {
    redirect('/ca/dashboard')
  }

  let actingAsFirmName: string | null = null
  if (actingAsClientId && user.org_id) {
    const client = await prisma.client.findUnique({
      where: { id: actingAsClientId, org_id: user.org_id },
      select: { name: true },
    })
    actingAsFirmName = client?.name ?? null
  }

  // For CLIENT users, look up their own firm name
  let clientFirmName: string | null = actingAsFirmName
  if (!clientFirmName && user.role === 'CLIENT' && user.client_id) {
    const ownClient = await prisma.client.findUnique({
      where: { id: user.client_id },
      select: { name: true },
    })
    clientFirmName = ownClient?.name ?? null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        navItems={CLIENT_NAV}
        userName={user.name}
        userEmail={user.email}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {actingAsClientId && actingAsFirmName && (
          <ActingAsBanner firmName={actingAsFirmName} clientId={actingAsClientId} />
        )}
        <WelcomeHeader userName={user.name} firmName={clientFirmName ?? undefined} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <InactivityWarning />
    </div>
  )
}
