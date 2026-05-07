'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { ClientDashboardTab }  from '@/components/dashboard/client-portal/ClientDashboardTab'
import { ClientAnalyticsTab }  from '@/components/dashboard/client-portal/ClientAnalyticsTab'
import { ClientHistoryTab }    from '@/components/dashboard/client-portal/ClientHistoryTab'
import { formatPeriod }        from '@/lib/format'
import type { ReconResult, FilingPeriod, ComputedDashboard } from '@/components/dashboard/client-portal/types'

type Tab = 'dashboard' | 'analytics' | 'history'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-pulse px-8 py-6 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
      </div>
      <div className="h-6 w-48 bg-slate-100 rounded" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
    </div>
  )
}

// ─── Inner component ──────────────────────────────────────────────────────────

function ClientDashboardInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const tabParam    = (searchParams.get('tab') as Tab | null) ?? 'dashboard'
  const periodParam = searchParams.get('period')

  const [activeTab, setActiveTab] = useState<Tab>(tabParam)
  const [period,    setPeriod]    = useState<string | null>(periodParam)
  const [periods,   setPeriods]   = useState<FilingPeriod[]>([])
  const [results,   setResults]   = useState<ReconResult[]>([])
  const [gstin,     setGstin]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  // Fetch reconciliation data whenever period changes
  useEffect(() => {
    let cancelled = false
    const qs = period ? `?period=${period}` : ''
    fetch(`/api/client/reconciliation${qs}`)
      .then(r => r.json())
      .then((d: { period: string | null; gstin: string | null; results: ReconResult[] }) => {
        if (cancelled) return
        if (!period && d.period) setPeriod(d.period)
        setGstin(d.gstin)
        setResults(d.results)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period])

  // Fetch periods list once on mount
  useEffect(() => {
    fetch('/api/client/periods')
      .then(r => r.json())
      .then((data: FilingPeriod[]) => setPeriods(data))
      .catch(() => {})
  }, [])

  // Compute all derived values in one pass
  const computed = useMemo((): ComputedDashboard | null => {
    if (!results.length && !loading) return null

    // AUTO_ACCEPTED rows have itc_at_risk = 0; safe ITC = total tax on matched invoices
    const itcSafe      = results.filter(r => r.result === 'AUTO_ACCEPTED').reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0)
    const itcAtRisk    = results.filter(r => r.result === 'PENDING_REVIEW').reduce((s, r) => s + r.itcAtRisk, 0)
    const itcBlocked   = results.filter(r => r.result === 'AUTO_REJECTED').reduce((s, r) => s + r.itcAtRisk, 0)
    const itcUnverified= results.filter(r => r.result === 'NOT_IN_BOOKS').reduce((s, r) => s + r.itcAtRisk, 0)

    const actionQueue  = results.filter(r => r.result !== 'AUTO_ACCEPTED')
    const completed    = results.filter(r => r.result === 'AUTO_ACCEPTED')

    // Aging buckets
    const today = new Date()
    const aging = { d30: 0, d60: 0, d90: 0, d90plus: 0 }
    actionQueue.forEach(r => {
      if (!r.invoiceDate) return
      const days = Math.floor((today.getTime() - new Date(r.invoiceDate).getTime()) / 86_400_000)
      if      (days <= 30) aging.d30     += r.itcAtRisk
      else if (days <= 60) aging.d60     += r.itcAtRisk
      else if (days <= 90) aging.d90     += r.itcAtRisk
      else                 aging.d90plus += r.itcAtRisk
    })

    // Leakage by cause
    const leakage = {
      supplierNotFiled: results.filter(r => r.result === 'NOT_IN_BOOKS').reduce((s, r) => s + r.itcAtRisk, 0),
      valueMismatch:    results.filter(r => r.result === 'AUTO_REJECTED').reduce((s, r) => s + r.itcAtRisk, 0),
      pendingReview:    results.filter(r => r.result === 'PENDING_REVIEW').reduce((s, r) => s + r.itcAtRisk, 0),
    }

    // Quality score
    const total         = results.length || 1
    const accepted      = results.filter(r => r.result === 'AUTO_ACCEPTED').length
    const autoAcceptPct = Math.round((accepted / total) * 100)
    const totalITC      = itcSafe + itcAtRisk + itcBlocked + itcUnverified || 1
    const recoveryRate  = Math.round((itcSafe / totalITC) * 100)
    const qualityScore  = Math.round((autoAcceptPct * 0.5) + (recoveryRate * 0.3) + 20)
    const qualityBand   = qualityScore >= 90 ? 'Excellent'
                        : qualityScore >= 75 ? 'Good'
                        : qualityScore >= 60 ? 'Fair'
                        : qualityScore >= 45 ? 'Poor'
                        : 'Critical'

    return {
      itcSafe, itcAtRisk, itcBlocked, itcUnverified,
      actionQueue, completed,
      leakage, aging,
      qualityScore, qualityBand, autoAcceptPct, recoveryRate,
    }
  }, [results, loading])

  const navigate = useCallback((tab: Tab, p?: string | null) => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (p) params.set('period', p)
    else if (period) params.set('period', period)
    router.replace(`/client/dashboard?${params.toString()}`)
    setActiveTab(tab)
  }, [router, period])

  // Optimistic toggle for mark-done
  const handleToggleDone = useCallback((resultId: string, isDone: boolean) => {
    setResults(prev => prev.map(r => r.id === resultId ? { ...r, isDone } : r))
  }, [])

  if (loading) return <DashboardSkeleton />

  return (
    <div>
      {/* Page header */}
      <div className="px-8 pt-6 pb-0 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">GST Dashboard</h1>
          {gstin && (
            <p className="text-xs text-slate-500 mt-1">
              {gstin} · Managed by your CA
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {periods.length > 0 && period && (
            <select
              value={period}
              onChange={e => {
                setPeriod(e.target.value)
                navigate(activeTab, e.target.value)
              }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5
                         text-slate-700 bg-white focus:outline-none focus:ring-2
                         focus:ring-slate-300"
            >
              {periods.map(p => (
                <option key={p.period} value={p.period}>{formatPeriod(p.period)}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="h-[34px] px-3 rounded-lg bg-white border border-slate-200
                       text-slate-700 text-xs font-medium hover:bg-slate-50
                       flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex px-8 mt-4 border-b border-slate-200">
        {([
          {
            key:        'dashboard' as const,
            label:      'Dashboard',
            badge:      computed?.actionQueue.length ?? 0,
            badgeClass: 'bg-red-50 text-red-600',
            suffix:     ' actions',
          },
          {
            key:        'analytics' as const,
            label:      'GST Health',
            badge:      4,
            badgeClass: 'bg-blue-50 text-blue-600',
            suffix:     ' insights',
          },
          {
            key:        'history' as const,
            label:      'History',
            badge:      periods.length,
            badgeClass: 'bg-green-50 text-green-600',
            suffix:     ' periods',
          },
        ]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => navigate(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                       border-b-2 -mb-px transition-colors whitespace-nowrap
                       ${activeTab === t.key
                         ? 'border-blue-600 text-blue-600'
                         : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t.badgeClass}`}>
                {t.badge}{t.suffix}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-8 py-5">
        {activeTab === 'dashboard' && computed && (
          <ClientDashboardTab computed={computed} onToggleDone={handleToggleDone} />
        )}
        {activeTab === 'analytics' && computed && (
          <ClientAnalyticsTab computed={computed} />
        )}
        {activeTab === 'history' && (
          <ClientHistoryTab periods={periods} />
        )}
        {!computed && activeTab !== 'history' && (
          <p className="py-12 text-center text-sm text-slate-400">
            No reconciliation data yet. Upload files to get started.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Page export (Suspense boundary for useSearchParams) ──────────────────────

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading…</div>}>
      <ClientDashboardInner />
    </Suspense>
  )
}
