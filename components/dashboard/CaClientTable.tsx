'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { NotifyButton } from '@/components/dashboard/NotifyButton'
import type { CaClientRow, QualityBand } from '@/lib/dashboard/ca'

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num) || num === 0) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const BAND_PILL: Record<QualityBand, string> = {
  Excellent: 'bg-green-50 text-green-700 border-green-200',
  Good:      'bg-blue-50 text-blue-700 border-blue-200',
  Fair:      'bg-amber-50 text-amber-700 border-amber-200',
  Poor:      'bg-red-50 text-red-700 border-red-200',
}

type FilterTab = 'All' | 'Pre-14th' | 'Critical' | 'No Upload'
const TABS: FilterTab[] = ['All', 'Pre-14th', 'Critical', 'No Upload']

function Sparkline({ history, score }: { history: number[]; score: number }) {
  const values = history.length > 0
    ? (history.length >= 6 ? history.slice(-6) : [...Array(6 - history.length).fill(history[0] ?? score), ...history])
    : Array(6).fill(score)
  const color = score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-blue-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-end gap-0.5 h-4">
      {values.map((v, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${color}`}
          style={{
            height: `${Math.max(2, Math.round((v / 100) * 14))}px`,
            opacity: 0.3 + i * 0.14,
          }}
        />
      ))}
    </div>
  )
}

function LeakageBar({ pct }: { pct: number }) {
  const color = pct > 20 ? 'bg-red-400' : pct > 10 ? 'bg-amber-400' : 'bg-green-400'
  return (
    <div className="mt-1 h-1 w-16 rounded-full bg-slate-100">
      <div className={`h-1 rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

export function CaClientTable({ rows, daysUntil14th }: { rows: CaClientRow[]; daysUntil14th: number }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const [viewQueueError, setViewQueueError] = useState<string | null>(null)

  const handleViewQueue = async (clientId: string) => {
    setViewQueueError(null)
    const res = await fetch(`/api/clients/${clientId}/acting-as`, { method: 'POST' })
    if (res.ok) {
      router.push('/client/dashboard')
    } else {
      const data = await res.json().catch(() => ({}))
      setViewQueueError(data.error ?? `Error ${res.status} — Failed to switch client.`)
    }
  }

  const inPre14thWindow = daysUntil14th >= 1 && daysUntil14th <= 5

  const filteredRows = rows.filter(row => {
    if (activeTab === 'All') return true
    if (activeTab === 'Pre-14th') return parseFloat(row.pre14thAtRisk) > 0
    if (activeTab === 'Critical') return row.status === 'Urgent'
    if (activeTab === 'No Upload') return row.status === 'No Upload'
    return true
  })

  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        No clients yet. Add your first client above.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {viewQueueError && (
        <p className="text-sm text-red-500">{viewQueueError}</p>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'text-blue-600 border-blue-500'
                : 'text-slate-500 border-transparent hover:text-slate-700',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Client', 'GSTINs', 'ITC at Risk', 'ITC Leakage ₹', 'Leakage %', 'Quality', 'Pending', 'Status', 'Actions'].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredRows.map(row => {
              const isUrgentDeadline = inPre14thWindow && parseFloat(row.pre14thAtRisk) > 0
              return (
                <tr
                  key={row.clientId}
                  className={isUrgentDeadline ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {row.gstinCount} {row.gstinCount === 1 ? 'GSTIN' : 'GSTINs'}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium whitespace-nowrap">
                    {formatINR(row.itcAtRisk)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="tabular-nums text-slate-700">{formatINR(row.itcLeakage)}</div>
                    <LeakageBar pct={row.leakagePct} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-500 whitespace-nowrap">
                    {row.leakagePct > 0 ? `${row.leakagePct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.status !== 'No Upload' ? (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-bold ${BAND_PILL[row.qualityBand]}`}>
                          {row.qualityScore}
                        </span>
                        <Sparkline history={row.scoreHistory} score={row.qualityScore} />
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-500 whitespace-nowrap">
                    {row.pendingActions > 0 ? row.pendingActions : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge value={row.status} />
                      {isUrgentDeadline && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 rounded px-1.5 py-0.5">
                          {daysUntil14th}d left
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-4">
                      <NotifyButton clientId={row.clientId} />
                      <button
                        type="button"
                        onClick={() => handleViewQueue(row.clientId)}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        View Queue →
                      </button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No clients match this filter.</p>
        )}
      </div>
    </div>
  )
}
