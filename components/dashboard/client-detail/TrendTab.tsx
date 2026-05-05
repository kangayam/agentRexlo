'use client'

import { useEffect, useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PeriodData {
  period:     string
  label:      string
  itcInBooks: string
  itcCleared: string
  score:      number
  band:       string
}

interface TrendData {
  periods: PeriodData[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BAND_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Excellent: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Good:      { text: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200' },
  Fair:      { text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  Poor:      { text: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  Critical:  { text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200' },
}

function fmtK(amount: string): string {
  const n = parseFloat(amount)
  if (isNaN(n) || n === 0) return '—'
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrendTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/clients/${clientId}/trend`)
      .then(r => r.json())
      .then((d: TrendData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [clientId])

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
  if (!data || data.periods.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        No trend data yet — upload data for at least one period to see trends.
      </div>
    )
  }

  const periods = data.periods
  const maxBooks = Math.max(...periods.map(p => parseFloat(p.itcInBooks)), 1)

  // Advisory based on most recent period's score
  const latest = periods[periods.length - 1]
  const prev   = periods.length >= 2 ? periods[periods.length - 2] : null
  const scoreDelta = prev ? latest.score - prev.score : 0
  const advisory = scoreDelta > 5
    ? `Quality score improved by ${scoreDelta} points from ${prev?.label}. Keep following up with suppliers before the 14th cutoff.`
    : scoreDelta < -5
    ? `Quality score dropped by ${Math.abs(scoreDelta)} points from ${prev?.label}. Review unmatched invoices and escalate with suppliers.`
    : `Quality score stable at ${latest.score}. Continue monthly supplier follow-ups to maintain ITC protection.`

  return (
    <div className="space-y-6">

      {/* Grouped Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">ITC Trend — Last 6 Periods</h3>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-200" />
            <span className="text-[11px] text-slate-500">In Books</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-[11px] text-slate-500">Cleared</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex items-end gap-3 h-40">
          {periods.map(p => {
            const booksPct   = parseFloat(p.itcInBooks) / maxBooks * 100
            const clearedPct = parseFloat(p.itcCleared) / maxBooks * 100
            return (
              <div key={p.period} className="flex-1 flex flex-col items-center gap-1">
                {/* Bars */}
                <div className="w-full flex items-end justify-center gap-0.5 h-32">
                  <div
                    className="flex-1 bg-blue-200 rounded-t-sm"
                    style={{ height: `${Math.max(2, booksPct)}%` }}
                    title={`In Books: ${fmtK(p.itcInBooks)}`}
                  />
                  <div
                    className="flex-1 bg-blue-500 rounded-t-sm"
                    style={{ height: `${Math.max(2, clearedPct)}%` }}
                    title={`Cleared: ${fmtK(p.itcCleared)}`}
                  />
                </div>
                {/* Label */}
                <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">{p.label}</span>
              </div>
            )
          })}
        </div>

        {/* Value axis hint */}
        <div className="mt-2 flex justify-between text-[10px] text-slate-300">
          <span>0</span>
          <span>{fmtK(maxBooks.toString())}</span>
        </div>
      </div>

      {/* Quality Score Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Quality Score History</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {periods.map(p => {
            const col = BAND_COLOR[p.band] ?? BAND_COLOR.Fair
            return (
              <div
                key={p.period}
                className={`rounded-lg border p-3 text-center ${col.bg} ${col.border}`}
              >
                <p className={`text-2xl font-bold font-mono ${col.text}`}>{p.score}</p>
                <p className={`text-[10px] font-semibold mt-0.5 ${col.text}`}>{p.band}</p>
                <p className="text-[11px] text-slate-500 mt-1">{p.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Advisory */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-semibold text-blue-800 mb-1">Trend Insight</p>
        <p className="text-xs text-blue-700">{advisory}</p>
      </div>
    </div>
  )
}
