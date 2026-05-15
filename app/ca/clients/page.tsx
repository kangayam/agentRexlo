import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { ClientPortfolioClient } from './ClientPortfolioClient'
import { computeQualityScore } from '@/lib/quality-score'

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
                select: {
                  igst: true,
                  cgst: true,
                  sgst: true,
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

    const reconResults = latestPeriod.ims_invoices
      .filter(inv => inv.reconciliation_result !== null)
      .map(inv => ({
        outcome: inv.reconciliation_result!.outcome as 'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS',
        igst:    parseFloat(inv.igst),
        cgst:    parseFloat(inv.cgst),
        sgst:    parseFloat(inv.sgst),
        itcAtRisk: parseFloat(inv.reconciliation_result!.itc_at_risk),
      }))

    // ITC cleared = tax value (igst+cgst+sgst) of AUTO_ACCEPTED invoices
    const itcCleared = reconResults
      .filter(r => r.outcome === 'AUTO_ACCEPTED')
      .reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0)

    // ITC at risk = itc_at_risk field for non-AUTO_ACCEPTED invoices
    const itcAtRisk = reconResults
      .filter(r => r.outcome !== 'AUTO_ACCEPTED')
      .reduce((s, r) => s + r.itcAtRisk, 0)

    const { qualityScore: qualScore, qualityBand: qualBand } = computeQualityScore(reconResults)

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
