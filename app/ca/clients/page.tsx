import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { ClientPortfolioClient } from './ClientPortfolioClient'

export default async function ClientPortfolioPage({
  searchParams,
}: {
  searchParams: { showArchived?: string }
}) {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  if (user.role === 'CLIENT') redirect('/client/dashboard')

  const orgId       = user.org_id ?? ''
  const isAdmin     = user.role === 'CA_ADMIN'
  const showArchived = isAdmin && searchParams.showArchived === 'true'

  const clients = await prisma.client.findMany({
    where: {
      org_id:      orgId,
      archived_at: showArchived ? { not: null } : null,
    },
    orderBy: { name: 'asc' },
    include: {
      gstins: {
        include: {
          upload_sessions: {
            orderBy: { period: 'desc' },
            take: 1,
            include: {
              ims_invoices: {
                include: {
                  reconciliation_result: {
                    select: { outcome: true, itc_at_risk: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const clientRows = clients.map(client => {
    const primaryGstin = client.gstins.find(g => g.is_primary)?.gstin
      ?? client.gstins[0]?.gstin
      ?? '—'
    const state = primaryGstin !== '—' ? primaryGstin.substring(0, 2) : '—'

    const latestPeriod = client.gstins
      .flatMap(g => g.upload_sessions)
      .sort((a, b) => b.period.localeCompare(a.period))[0] ?? null

    if (!latestPeriod?.ims_uploaded_at) {
      return {
        clientId:           client.id,
        clientName:         client.name,
        gstin:              primaryGstin,
        state,
        status:             'NO_UPLOAD' as const,
        qualScore:          null as number | null,
        qualBand:           null as string | null,
        itcCleared:         0,
        itcAtRisk:          0,
        period:             null as string | null,
        periodStatus:       null as string | null,
        lastUpload:         null as string | null,
        archivedAt:         client.archived_at?.toISOString() ?? null,
        scheduledDeleteAt:  client.scheduled_delete_at?.toISOString() ?? null,
      }
    }

    const results = latestPeriod.ims_invoices
      .map(inv => inv.reconciliation_result)
      .filter((r): r is NonNullable<typeof r> => r !== null)

    const itcCleared = results
      .filter(r => r.outcome === 'AUTO_ACCEPTED')
      .reduce((s, r) => s + parseFloat(r.itc_at_risk), 0)

    const itcAtRisk = results
      .filter(r => r.outcome !== 'AUTO_ACCEPTED')
      .reduce((s, r) => s + parseFloat(r.itc_at_risk), 0)

    const itcTotal = itcCleared + itcAtRisk || 1
    const total    = results.length || 1
    const accepted = results.filter(r => r.outcome === 'AUTO_ACCEPTED').length
    const autoRate  = Math.round((accepted / total) * 100)
    const recovRate = Math.round((itcCleared / itcTotal) * 100)
    const qualScore = Math.min(100, Math.round((autoRate * 0.5) + (recovRate * 0.3) + 20))
    const qualBand  = qualScore >= 90 ? 'Excellent'
                    : qualScore >= 75 ? 'Good'
                    : qualScore >= 60 ? 'Fair'
                    : qualScore >= 45 ? 'Poor'
                    : 'Critical'

    const today        = new Date()
    const daysUntil14  = 14 - today.getDate()
    const isPreDeadline = daysUntil14 >= 0 && daysUntil14 <= 8

    let status: 'RECONCILED' | 'NEEDS_ATTENTION' | 'URGENT' | 'NO_UPLOAD'
    if (itcAtRisk > 0 && isPreDeadline) {
      status = 'URGENT'
    } else if (itcAtRisk > 0) {
      status = 'NEEDS_ATTENTION'
    } else if (qualScore >= 75) {
      status = 'RECONCILED'
    } else {
      status = 'NEEDS_ATTENTION'
    }

    const lastUploadDate = latestPeriod.tally_uploaded_at ?? latestPeriod.ims_uploaded_at

    return {
      clientId:           client.id,
      clientName:         client.name,
      gstin:              primaryGstin,
      state,
      status,
      qualScore,
      qualBand,
      itcCleared,
      itcAtRisk,
      period:             latestPeriod.period,
      periodStatus:       latestPeriod.status.toLowerCase(),
      lastUpload:         lastUploadDate?.toISOString() ?? null,
      archivedAt:         client.archived_at?.toISOString() ?? null,
      scheduledDeleteAt:  client.scheduled_delete_at?.toISOString() ?? null,
    }
  })

  const summary = {
    total:          clientRows.length,
    reconciled:     clientRows.filter(c => c.status === 'RECONCILED').length,
    needsAttention: clientRows.filter(c => c.status === 'NEEDS_ATTENTION').length,
    urgent:         clientRows.filter(c => c.status === 'URGENT').length,
    noUpload:       clientRows.filter(c => c.status === 'NO_UPLOAD').length,
  }

  return (
    <ClientPortfolioClient
      clientRows={clientRows}
      summary={summary}
      isAdmin={isAdmin}
      showArchived={showArchived}
    />
  )
}
