import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { PortfolioAnalyticsClient } from './PortfolioAnalyticsClient'
import type { ClientAnalytic } from './PortfolioAnalyticsClient'
import Decimal from 'decimal.js'

export default async function PortfolioAnalyticsPage() {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  if (user.role === 'CLIENT') redirect('/client/dashboard')

  const orgId = user.org_id ?? ''
  const today = new Date()
  const daysUntil14th = 14 - today.getDate()

  const clients = await prisma.client.findMany({
    where: { org_id: orgId },
    include: {
      gstins: {
        include: {
          upload_sessions: {
            where: { status: 'DONE' },
            orderBy: { period: 'desc' },
            take: 6,
            include: {
              ims_invoices: {
                include: { reconciliation_result: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // ── Per-client analytics ─────────────────────────────────────────────
  const clientAnalytics: ClientAnalytic[] = []

  for (const client of clients) {
    // Flatten all sessions across GSTINs, sorted newest first
    const allSessions = client.gstins
      .flatMap(g => g.upload_sessions)
      .sort((a, b) => b.period.localeCompare(a.period))

    if (allSessions.length === 0) continue

    // Group sessions by period (multiple GSTINs can share a period)
    const sessionsByPeriod = new Map<string, typeof allSessions>()
    for (const s of allSessions) {
      const arr = sessionsByPeriod.get(s.period) ?? []
      arr.push(s)
      sessionsByPeriod.set(s.period, arr)
    }

    const periods = [...sessionsByPeriod.entries()].sort(([a], [b]) => b.localeCompare(a))
    if (periods.length === 0) continue

    const computePeriodStats = (sessions: typeof allSessions) => {
      const invoices = sessions.flatMap(s => s.ims_invoices)
      let cleared = new Decimal(0)
      let atRisk   = new Decimal(0)
      let blocked  = new Decimal(0)
      let unverif  = new Decimal(0)
      let aging    = { d30: new Decimal(0), d60: new Decimal(0), d90: new Decimal(0), d90plus: new Decimal(0) }
      let total = 0, accepted = 0

      for (const inv of invoices) {
        const r = inv.reconciliation_result
        if (!r) continue
        total++
        const invoiceItc = new Decimal(inv.igst).plus(inv.cgst).plus(inv.sgst)

        if (r.outcome === 'AUTO_ACCEPTED') {
          accepted++
          cleared = cleared.plus(invoiceItc)
        } else {
          const risk = new Decimal(r.itc_at_risk)
          if (r.outcome === 'PENDING_REVIEW')  atRisk  = atRisk.plus(risk)
          else if (r.outcome === 'AUTO_REJECTED') blocked = blocked.plus(risk)
          else if (r.outcome === 'NOT_IN_BOOKS')  unverif = unverif.plus(risk)

          const invoiceDate = inv.invoice_date
          if (invoiceDate) {
            const days = Math.floor(
              (today.getTime() - new Date(invoiceDate).getTime()) / 86_400_000,
            )
            if      (days <= 30) aging.d30     = aging.d30.plus(risk)
            else if (days <= 60) aging.d60     = aging.d60.plus(risk)
            else if (days <= 90) aging.d90     = aging.d90.plus(risk)
            else                 aging.d90plus = aging.d90plus.plus(risk)
          }
        }
      }

      const itcTotal    = cleared.plus(atRisk).plus(blocked).plus(unverif)
      const leakage     = atRisk.plus(blocked).plus(unverif)
      const autoRate    = total > 0 ? accepted / total : 0
      const recovRate   = itcTotal.gt(0) ? cleared.div(itcTotal).toNumber() : 0
      const qualScore   = Math.min(100, Math.round(autoRate * 50 + recovRate * 30 + 20))

      return { cleared, atRisk, blocked, unverif, itcTotal, leakage, aging, total, accepted, qualScore }
    }

    const [latestPeriod, latestSessions] = periods[0]
    const ls = computePeriodStats(latestSessions)

    const leakagePct = ls.itcTotal.gt(0)
      ? Math.round(ls.leakage.div(ls.itcTotal).times(100).toNumber())
      : 0

    const qualBand =
      ls.qualScore >= 90 ? 'Excellent'
      : ls.qualScore >= 75 ? 'Good'
      : ls.qualScore >= 60 ? 'Fair'
      : ls.qualScore >= 45 ? 'Poor' : 'Critical'

    // 3-period trend (oldest → newest)
    const trend = periods.slice(0, 3).reverse().map(([period, sessions]) => {
      const s = computePeriodStats(sessions)
      return {
        period,
        itcCleared: s.cleared.toNumber(),
        itcAtRisk:  s.leakage.toNumber(),
        qualScore:  s.qualScore,
      }
    })

    const trendDir: 'improving' | 'declining' | 'stable' =
      trend.length >= 2
        ? trend[trend.length - 1].qualScore >= trend[trend.length - 2].qualScore
          ? 'improving' : 'declining'
        : 'stable'

    clientAnalytics.push({
      clientId:    client.id,
      clientName:  client.name,
      gstin:       client.gstins[0]?.gstin ?? '—',
      period:      latestPeriod,
      itcCleared:  ls.cleared.toNumber(),
      itcAtRisk:   ls.atRisk.toNumber(),
      itcBlocked:  ls.blocked.toNumber(),
      itcUnverified: ls.unverif.toNumber(),
      itcTotal:    ls.itcTotal.toNumber(),
      leakage: {
        supplierNotFiled: ls.unverif.toNumber(),
        valueMismatch:    ls.blocked.toNumber(),
        pendingReview:    ls.atRisk.toNumber(),
      },
      totalLeakage: ls.leakage.toNumber(),
      leakagePct,
      qualScore:   ls.qualScore,
      qualBand,
      aging: {
        d30:     ls.aging.d30.toNumber(),
        d60:     ls.aging.d60.toNumber(),
        d90:     ls.aging.d90.toNumber(),
        d90plus: ls.aging.d90plus.toNumber(),
      },
      trend,
      trendDir,
      lastUploadDate: latestSessions[0]?.tally_uploaded_at?.toISOString() ?? null,
    })
  }

  // ── Portfolio aggregates ─────────────────────────────────────────────
  const portfolioTotals = {
    itcCleared:    clientAnalytics.reduce((s, c) => s + c.itcCleared, 0),
    itcAtRisk:     clientAnalytics.reduce((s, c) => s + c.totalLeakage, 0),
    totalLeakage:  clientAnalytics.reduce((s, c) => s + c.totalLeakage, 0),
    avgQualScore:  clientAnalytics.length > 0
      ? Math.round(clientAnalytics.reduce((s, c) => s + c.qualScore, 0) / clientAnalytics.length)
      : 0,
    activeClients: clientAnalytics.length,
  }

  // Portfolio trend — aggregate by period across all clients
  const periodMap: Record<string, { cleared: number; atRisk: number; scores: number[] }> = {}
  for (const c of clientAnalytics) {
    for (const t of c.trend) {
      if (!periodMap[t.period]) periodMap[t.period] = { cleared: 0, atRisk: 0, scores: [] }
      periodMap[t.period].cleared += t.itcCleared
      periodMap[t.period].atRisk  += t.itcAtRisk
      periodMap[t.period].scores.push(t.qualScore)
    }
  }
  const portfolioTrend = Object.entries(periodMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      itcCleared:   data.cleared,
      itcAtRisk:    data.atRisk,
      avgQualScore: data.scores.length > 0
        ? Math.round(data.scores.reduce((s, n) => s + n, 0) / data.scores.length)
        : 0,
    }))

  const portfolioLeakage = {
    supplierNotFiled: clientAnalytics.reduce((s, c) => s + c.leakage.supplierNotFiled, 0),
    valueMismatch:    clientAnalytics.reduce((s, c) => s + c.leakage.valueMismatch, 0),
    pendingReview:    clientAnalytics.reduce((s, c) => s + c.leakage.pendingReview, 0),
  }

  const portfolioAging = {
    d30:     clientAnalytics.reduce((s, c) => s + c.aging.d30, 0),
    d60:     clientAnalytics.reduce((s, c) => s + c.aging.d60, 0),
    d90:     clientAnalytics.reduce((s, c) => s + c.aging.d90, 0),
    d90plus: clientAnalytics.reduce((s, c) => s + c.aging.d90plus, 0),
  }

  return (
    <PortfolioAnalyticsClient
      clientAnalytics={clientAnalytics}
      portfolioTotals={portfolioTotals}
      portfolioTrend={portfolioTrend}
      portfolioLeakage={portfolioLeakage}
      portfolioAging={portfolioAging}
      daysUntil14th={daysUntil14th}
    />
  )
}
