import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { deriveClientStatus, deriveQualityBand, sortCaRows } from '@/lib/dashboard/ca'
import type { CaClientRow } from '@/lib/dashboard/ca'
import { CaClientTable } from '@/components/dashboard/CaClientTable'
import Decimal from 'decimal.js'

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num) || num === 0) return '₹0'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

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
    include: { gstins: true },
    orderBy: { name: 'asc' },
  })

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
            client: { org_id: user.org_id ?? '' },
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
            include: { client_gstin: true },
          },
        },
      },
    },
  })

  const today = new Date()
  const daysUntil14th = 14 - today.getDate()
  const inPre14thWindow = daysUntil14th >= 1 && daysUntil14th <= 4

  type ClientStats = {
    itcAtRisk:           Decimal
    itcLeakage:          Decimal
    itcInBooks:          Decimal
    pendingActions:      number
    period:              string | null
    totalInvoices:       number
    autoAccepted:        number
    nonAutoAccepted:     number
    doneNonAutoAccepted: number
  }

  const clientStats = new Map<string, ClientStats>()

  for (const r of allResults) {
    const cid = r.ims_invoice.upload_session.client_gstin.client_id
    if (!clientStats.has(cid)) {
      clientStats.set(cid, {
        itcAtRisk:           new Decimal(0),
        itcLeakage:          new Decimal(0),
        itcInBooks:          new Decimal(0),
        pendingActions:      0,
        period:              r.ims_invoice.upload_session.period,
        totalInvoices:       0,
        autoAccepted:        0,
        nonAutoAccepted:     0,
        doneNonAutoAccepted: 0,
      })
    }
    const stats = clientStats.get(cid)!
    stats.totalInvoices += 1

    const invoiceItc = new Decimal(r.ims_invoice.igst)
      .plus(r.ims_invoice.cgst)
      .plus(r.ims_invoice.sgst)
    stats.itcInBooks = stats.itcInBooks.plus(invoiceItc)

    if (r.outcome === 'AUTO_ACCEPTED') {
      stats.autoAccepted += 1
    } else {
      stats.nonAutoAccepted += 1
      stats.itcLeakage = stats.itcLeakage.plus(new Decimal(r.itc_at_risk.toString()))
      if (r.is_done) {
        stats.doneNonAutoAccepted += 1
      } else {
        stats.itcAtRisk = stats.itcAtRisk.plus(new Decimal(r.itc_at_risk.toString()))
        stats.pendingActions += 1
      }
    }
  }

  const rawRows: CaClientRow[] = clients.map(c => {
    const stats = clientStats.get(c.id)
    const hasUpload = stats !== undefined
    const itcAtRisk      = stats?.itcAtRisk.toString() ?? '0'
    const itcLeakage     = stats?.itcLeakage.toString() ?? '0'
    const pendingActions = stats?.pendingActions ?? 0
    const period         = stats?.period ?? null

    const totalInvoices       = stats?.totalInvoices ?? 0
    const autoAccepted        = stats?.autoAccepted ?? 0
    const nonAutoAccepted     = stats?.nonAutoAccepted ?? 0
    const doneNonAutoAccepted = stats?.doneNonAutoAccepted ?? 0
    const itcInBooks          = stats?.itcInBooks ?? new Decimal(0)

    const autoAcceptRate  = totalInvoices > 0 ? autoAccepted / totalInvoices : 0
    const itcRecoveryRate = nonAutoAccepted > 0 ? doneNonAutoAccepted / nonAutoAccepted : 1
    const qualityScore    = hasUpload
      ? Math.round((autoAcceptRate * 50) + (itcRecoveryRate * 30) + (0.8 * 20))
      : 0

    const leakagePct = itcInBooks.gt(0)
      ? parseFloat(new Decimal(itcLeakage).div(itcInBooks).times(100).toFixed(1))
      : 0

    const pre14thAtRisk = inPre14thWindow ? itcAtRisk : '0'

    return {
      clientId:      c.id,
      name:          c.name,
      gstinCount:    c.gstins.length,
      period,
      itcAtRisk,
      itcLeakage,
      leakagePct,
      qualityScore,
      qualityBand:   deriveQualityBand(qualityScore),
      daysUntil14th,
      pre14thAtRisk,
      scoreHistory:  [],
      pendingActions,
      status:        deriveClientStatus(pendingActions, itcAtRisk, hasUpload),
    }
  })

  const rows = sortCaRows(rawRows)

  // Org-level summary totals
  let totalItcSafe     = new Decimal(0)
  let totalItcLeakage  = new Decimal(0)
  let totalPre14thRisk = new Decimal(0)
  let qualitySum       = 0
  let qualityCount     = 0

  for (const r of allResults) {
    if (r.outcome === 'AUTO_ACCEPTED') {
      totalItcSafe = totalItcSafe
        .plus(r.ims_invoice.igst)
        .plus(r.ims_invoice.cgst)
        .plus(r.ims_invoice.sgst)
    }
  }
  for (const row of rawRows) {
    totalItcLeakage  = totalItcLeakage.plus(row.itcLeakage)
    totalPre14thRisk = totalPre14thRisk.plus(row.pre14thAtRisk)
    if (row.status !== 'No Upload') {
      qualitySum += row.qualityScore
      qualityCount++
    }
  }

  const avgQualityScore     = qualityCount > 0 ? Math.round(qualitySum / qualityCount) : 0
  const pre14thClientCount  = rawRows.filter(r => parseFloat(r.pre14thAtRisk) > 0).length
  const showPre14thBanner   = inPre14thWindow && pre14thClientCount > 0

  const periodLabel = activePeriod
    ? new Date(activePeriod + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    : 'No data yet'

  return (
    <div className="space-y-6 p-6">
      {/* Pre-14th alert banner */}
      {showPre14thBanner && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              GSTR-2B deadline in {daysUntil14th} day{daysUntil14th !== 1 ? 's' : ''} —{' '}
              {pre14thClientCount} client{pre14thClientCount !== 1 ? 's have' : ' has'} unresolved ITC at risk
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              Invoices not actioned by the 14th will not appear in GSTR-2B and ITC will be lost.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Client Overview</h1>
        <p className="mt-1 text-sm text-gray-500">{periodLabel}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-medium text-slate-500 mb-2">ITC Cleared</p>
          <p className="text-2xl font-extrabold font-mono tracking-tight text-green-700">
            {formatINR(totalItcSafe.toString())}
          </p>
          <p className="mt-1 text-xs font-medium text-green-600">Auto-matched this period</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-slate-500 mb-2">ITC Leakage</p>
          <p className="text-2xl font-extrabold font-mono tracking-tight text-amber-700">
            {formatINR(totalItcLeakage.toString())}
          </p>
          <p className="mt-1 text-xs font-medium text-amber-600">At-risk across all clients</p>
        </div>
        <div className={`rounded-xl border p-5 ${showPre14thBanner ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className="text-sm font-medium text-slate-500 mb-2">Pre-14th Risk</p>
          <p className={`text-2xl font-extrabold font-mono tracking-tight ${showPre14thBanner ? 'text-red-700' : 'text-slate-600'}`}>
            {inPre14thWindow ? formatINR(totalPre14thRisk.toString()) : '—'}
          </p>
          <p className={`mt-1 text-xs font-medium ${showPre14thBanner ? 'text-red-600' : 'text-slate-500'}`}>
            {inPre14thWindow ? `${daysUntil14th}d to GSTR-2B deadline` : 'Outside deadline window'}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-slate-500 mb-2">Avg Quality</p>
          <p className="text-2xl font-extrabold font-mono tracking-tight text-blue-700">
            {qualityCount > 0 ? `${avgQualityScore}` : '—'}
          </p>
          <p className="mt-1 text-xs font-medium text-blue-600">
            {qualityCount > 0 ? `Across ${qualityCount} active client${qualityCount !== 1 ? 's' : ''}` : 'No active clients'}
          </p>
        </div>
      </div>

      {/* Client table */}
      <CaClientTable rows={rows} daysUntil14th={daysUntil14th} />
    </div>
  )
}
