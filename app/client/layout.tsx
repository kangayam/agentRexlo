import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { ActingAsBanner } from '@/components/acting-as-banner'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const actingAsClientId = cookieStore.get('actingAsClientId')?.value ?? null

  let actingAsFirmName: string | null = null
  if (actingAsClientId) {
    const client = await prisma.client.findUnique({
      where: { id: actingAsClientId },
      select: { name: true },
    })
    actingAsFirmName = client?.name ?? null
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
