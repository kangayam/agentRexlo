import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { ActingAsBanner } from '@/components/acting-as-banner'
import { getAuthedUser } from '@/lib/auth/session'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const actingAsClientId = cookieStore.get('actingAsClientId')?.value ?? null

  let actingAsFirmName: string | null = null
  if (actingAsClientId) {
    try {
      const dbUser = await getAuthedUser()
      if (dbUser.org_id) {
        const client = await prisma.client.findUnique({
          where: { id: actingAsClientId, org_id: dbUser.org_id },
          select: { name: true },
        })
        actingAsFirmName = client?.name ?? null
      }
    } catch {
      // unauthenticated or lookup failed — skip banner
    }
  }

  return (
    <>
      {actingAsClientId && actingAsFirmName && (
        <ActingAsBanner firmName={actingAsFirmName} clientId={actingAsClientId} />
      )}
      {children}
    </>
  )
}
