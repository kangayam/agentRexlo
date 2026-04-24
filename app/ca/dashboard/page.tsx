import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { deriveClientStatus, sortCaRows } from '@/lib/dashboard/ca'
import type { CaClientRow } from '@/lib/dashboard/ca'
import { CaClientTable } from '@/components/dashboard/CaClientTable'
import Decimal from 'decimal.js'

export default async function CADashboardPage() {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  if (user.role === 'CLIENT') {
    redirect('/client/dashboard')
  }

  const clients = await prisma.client.findMany({
    where: { org_id: user.org_id ?? '' },
    include: {
      gstins: true,
    },
    orderBy: { name: 'asc' },
  })

  // Find the most recent completed period across all org clients
  const latestSession = await prisma.uploadSession.findFirst({
    where: {
      status: 'DONE',
      client_gstin: { client: { org_id: user.org_id ?? '' } },
    },
    orderBy: { period: 'desc' },
    select: { period: true },
  })

  const activePeriod = latestSession?.period ?? null

  const allResults = await prisma.reconciliationResult.findMany({
    where: {
      ims_invoice: {
        upload_session: {
          client_gstin: {
            client: {
              org_id: user.org_id ?? '',
            },
          },
          period: activePeriod ?? '__none__',
          status: 'DONE',
        },
      },
    },
    include: {
      ims_invoice: {
        include: {
          upload_session: {
            include: {
              client_gstin: true,
            },
          },
        },
      },
    },
  })

  // Map from clientId → { itcAtRisk, pendingActions, period }
  const clientStats = new Map<string, { itcAtRisk: Decimal; pendingActions: number; period: string | null }>()

  for (const r of allResults) {
    const cid = r.ims_invoice.upload_session.client_gstin.client_id
    if (!clientStats.has(cid)) {
      clientStats.set(cid, {
        itcAtRisk: new Decimal(0),
        pendingActions: 0,
        period: r.ims_invoice.upload_session.period,
      })
    }
    const stats = clientStats.get(cid)!
    if (r.outcome !== 'AUTO_ACCEPTED' && !r.is_done) {
      stats.itcAtRisk = stats.itcAtRisk.plus(new Decimal(r.itc_at_risk.toString()))
    }
    if (!r.is_done && r.outcome !== 'AUTO_ACCEPTED') {
      stats.pendingActions += 1
    }
  }

  const rawRows: CaClientRow[] = clients.map(c => {
    const stats = clientStats.get(c.id)
    const hasUpload = stats !== undefined
    const itcAtRisk = stats?.itcAtRisk.toString() ?? '0'
    const pendingActions = stats?.pendingActions ?? 0
    const period = stats?.period ?? null

    return {
      clientId: c.id,
      name: c.name,
      gstinCount: c.gstins.length,
      period,
      itcAtRisk,
      pendingActions,
      status: deriveClientStatus(pendingActions, itcAtRisk, hasUpload),
    }
  })

  const rows = sortCaRows(rawRows)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Client Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          {activePeriod
            ? new Date(activePeriod + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })
            : 'No data yet'}
        </p>
      </div>
      <CaClientTable rows={rows} />
    </div>
  )
}
