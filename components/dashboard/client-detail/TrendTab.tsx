'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, BarChart2, Upload } from 'lucide-react'
import { formatINR } from '@/lib/format'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PeriodData {
  period:      string
  label:       string
  itcInBooks:  string
  itcCleared:  string
  score:       number
  band:        string
  leakagePct:  number
}

interface TrendData {
  periods: PeriodData[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function longPeriod(yyyymm: string): string {
  const [yyyy, mm] = yyyymm.split('-')
  return new Date(Number(yyyy), Number(mm) - 1, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function nextPeriodLabel(yyyymm: string): string {
  const [yyyy, mm] = yyyymm.split('-')
  return new Date(Number(yyyy), Number(mm), 1)  // month+1 = next month
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function fmtK(amount: string): string {
  const n = parseFloat(amount)
  if (isNaN(n) || n === 0) return '—'
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

const BAND_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Excellent: { text: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
  Good:      { text: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-200'   },
  Fair:      { text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  Poor:      { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  Critical:  { text: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'    },
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function TrendEmptyState({
  baseline,
  clientId,
}: {
  baseline: PeriodData | null
  clientId: string
}) {
  const router    = useRouter()
  const [busy, setBusy] = useState(false)

  const baseLabel = baseline ? longPeriod(baseline.period) : null
  const nextLabel = baseline ? nextPeriodLabel(baseline.period) : 'next month'

  const handleUpload = async () => {
    setBusy(true)
    try {
      await fetch(`/api/clients/${clientId}/acting-as`, { method: 'POST' })
      router.push('/client/upload')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto text-center py-8">

      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200
                      flex items-center justify-center mx-auto mb-5">
        <TrendingUp className="w-6 h-6 text-blue-600" />
      </div>

      <h2 className="text-base font-extrabold text-slate-900 mb-2 tracking-tight">
        Trend data available from next month
      </h2>
      <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-sm mx-auto">
        The trend chart compares ITC performance across multiple months.
        You need at least 2 completed periods —{' '}
        {nextLabel ? `upload ${nextLabel} data` : 'upload next month\'s data'} to unlock this view.
      </p>

      {/* Progress tracker */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-left">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Progress to trend chart
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-2">
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center
                          text-white text-xs font-bold flex-shrink-0">
            ✓
          </div>
          <div className="flex-1 h-0.5 bg-green-500" />
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center
                          text-white text-xs font-bold flex-shrink-0 ring-4 ring-blue-100">
            2
          </div>
          <div className="flex-1 h-0.5 bg-slate-200" />
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center
                          text-slate-400 text-xs font-bold flex-shrink-0">
            3
          </div>
        </div>

        <div className="flex justify-between text-[10px] mt-1">
          <span className="text-green-600 font-medium">
            {baseLabel ?? 'Period 1'} ✓<br />
            <span className="text-slate-400 font-normal">Complete</span>
          </span>
          <span className="text-blue-600 font-medium text-center">
            {nextLabel ?? 'Next period'}<br />
            <span className="text-slate-400 font-normal">In progress</span>
          </span>
          <span className="text-slate-400 text-right">
            Chart unlocks<br />after {nextLabel ?? 'next period'}
          </span>
        </div>
      </div>

      {/* Baseline snapshot */}
      {baseline && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl
                        p-3.5 mb-5 text-left flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center
                          justify-center flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {baseLabel} — Your baseline
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Quality Score: {baseline.score} ·{' '}
              ITC Cleared: ₹{formatINR(parseFloat(baseline.itcCleared))} ·{' '}
              Leakage: {baseline.leakagePct}%
            </p>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                   bg-slate-900 text-white text-sm font-semibold
                   hover:bg-slate-800 transition-colors disabled:opacity-60"
      >
        <Upload className="w-4 h-4" />
        {busy ? 'Switching…' : `Upload ${nextLabel ?? 'next period'} data`}
      </button>
    </div>
  )
}

// ─── Live chart ───────────────────────────────────────────────────────────────

function TrendChart({ periods }: { periods: PeriodData[] }) {
  const maxVal = Math.max(...periods.map(p => parseFloat(p.itcInBooks)), 1)
  const first  = periods[0]
  const last   = periods[periods.length - 1]

  const scoreDelta   = last.score - first.score
  const leakageDelta = last.leakagePct - first.leakagePct
  const improving    = scoreDelta > 0

  return (
    <div className="space-y-4">

      {/* Bar chart panel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">ITC Trend — Books vs GSTR-2B</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {longPeriod(first.period)} – {longPeriod(last.period)}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-100" />
              ITC in Books
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
              ITC Cleared
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-end gap-3 h-24 mb-2">
            {periods.map((p, i) => {
              const booksH   = Math.max(4, Math.round((parseFloat(p.itcInBooks)  / maxVal) * 80))
              const clearedH = Math.max(4, Math.round((parseFloat(p.itcCleared) / maxVal) * 80))
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="flex items-end gap-1 w-full" style={{ height: '80px' }}>
                    <div
                      className="flex-1 bg-blue-100 rounded-t-sm"
                      style={{ height: `${booksH}px` }}
                      title={`In Books: ${fmtK(p.itcInBooks)}`}
                    />
                    <div
                      className="flex-1 bg-blue-600 rounded-t-sm"
                      style={{ height: `${clearedH}px` }}
                      title={`Cleared: ${fmtK(p.itcCleared)}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3">
            {periods.map((p, i) => (
              <div key={i} className="flex-1 text-center">
                <span className={`text-[9px] ${
                  i === periods.length - 1 ? 'font-bold text-slate-700' : 'text-slate-400'
                }`}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality score history */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Quality Score Trend</h3>

        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${periods.length}, minmax(0, 1fr))` }}
        >
          {periods.map((p, i) => {
            const isLatest = i === periods.length - 1
            const col = BAND_COLOR[p.band] ?? BAND_COLOR.Fair
            return (
              <div
                key={i}
                className={`text-center p-3 rounded-lg border
                  ${col.bg} ${col.border}
                  ${isLatest ? `ring-2 ring-offset-1 ${col.border}` : ''}`}
              >
                <p className="text-[9px] text-slate-400 mb-1.5">
                  {p.label}{isLatest ? ' ←' : ''}
                </p>
                <p className={`text-lg font-extrabold font-mono ${col.text}`}>{p.score}</p>
                <p className={`text-[9px] font-semibold mt-0.5 ${col.text}`}>{p.band}</p>
              </div>
            )
          })}
        </div>

        {/* Auto-generated insight */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg
                        text-xs text-blue-800 leading-relaxed">
          {improving ? '📈' : '📉'}{' '}
          {improving
            ? `Score improved by ${scoreDelta} points since ${longPeriod(first.period)}. `
            : `Score dropped by ${Math.abs(scoreDelta)} points since ${longPeriod(first.period)}. `
          }
          {leakageDelta < 0
            ? `ITC leakage reduced from ${first.leakagePct}% to ${last.leakagePct}%. `
            : `ITC leakage increased from ${first.leakagePct}% to ${last.leakagePct}%. `
          }
          {improving
            ? 'Keep uploading before the 10th to maintain the trend.'
            : 'Contact your CA to review the reconciliation process.'
          }
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrendTab({ clientId }: { clientId: string }) {
  const [data,    setData]    = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/clients/${clientId}/trend`)
      .then(r => r.json())
      .then((d: TrendData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [clientId])

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>

  const periods = data?.periods ?? []

  if (periods.length < 2) {
    return (
      <TrendEmptyState
        baseline={periods[0] ?? null}
        clientId={clientId}
      />
    )
  }

  return <TrendChart periods={periods} />
}
