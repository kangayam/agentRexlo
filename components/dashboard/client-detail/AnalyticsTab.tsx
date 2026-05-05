'use client'

import { useEffect, useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeakageItem {
  cause:       string
  amount:      string
  count:       number
  recoverable: boolean
}

interface Quality {
  score:             number
  band:              string
  autoAcceptRate:    number
  itcRecoveryRate:   number
  deadlineAdherence: number
}

interface AgingBucket {
  bucket:    string
  amount:    string
  count:     number
  suppliers: string[]
}

interface Vendor {
  supplierGstin: string
  invoiceNumber: string
  amount:        string
  reason:        string
  outcome:       string
}

interface AnalyticsData {
  leakage:    { items: LeakageItem[]; totalRecoverable: string; total: string }
  quality:    Quality
  aging:      AgingBucket[]
  vendors:    Vendor[] | null
  dayOfMonth: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: string): string {
  const n = parseFloat(amount)
  if (isNaN(n) || n === 0) return '—'
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const AGING_COLOR: Record<string, { bar: string; text: string; bg: string }> = {
  '0–30d':  { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50' },
  '31–60d': { bar: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50' },
  '61–90d': { bar: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  '90+':    { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50' },
}

const BAND_COLOR: Record<string, { ring: string; text: string; bg: string; border: string }> = {
  Excellent: { ring: '#10B981', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Good:      { ring: '#14B8A6', text: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200' },
  Fair:      { ring: '#F59E0B', text: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  Poor:      { ring: '#F97316', text: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  Critical:  { ring: '#EF4444', text: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
}

const ADVISORY: Record<string, string> = {
  Excellent: 'Excellent reconciliation health. ITC claims are well-protected this period.',
  Good:      'Good match rate. Review pending items to improve further.',
  Fair:      'Action needed on flagged invoices. Follow up with suppliers to resolve mismatches.',
  Poor:      'High leakage risk. Prioritise supplier follow-ups before the 14th deadline.',
  Critical:  'Critical ITC exposure. Immediate action required — contact suppliers and review rejected invoices today.',
}

const OUTCOME_LABELS: Record<string, string> = {
  AUTO_REJECTED:  'Rejected',
  PENDING_REVIEW: 'Review needed',
  NOT_IN_BOOKS:   'Not in books',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  )
}

function QualityCircle({ score, band }: { score: number; band: string }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(100, score) / 100)
  const col = BAND_COLOR[band]?.ring ?? '#94A3B8'
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#E2E8F0" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={col} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono" style={{ color: col }}>{score}</span>
        <span className="text-[10px] font-semibold text-slate-500">{band}</span>
      </div>
    </div>
  )
}

function SubScoreBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function exportVendorCSV(vendors: Vendor[], clientId: string) {
  const header = 'supplier_gstin,invoice_no,itc_at_risk,reason'
  const rows = vendors.map(v =>
    `${v.supplierGstin},${v.invoiceNumber},${v.amount},${v.reason}`
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vendor-list-${clientId}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-48 bg-slate-100 rounded-xl" />
        <div className="h-48 bg-slate-100 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsTab({ clientId, period }: { clientId: string; period: string | null }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Only show skeleton on first load — period changes update in place
    if (!data) setLoading(true)
    const qs = period ? `?period=${period}` : ''
    fetch(`/api/clients/${clientId}/analytics${qs}`)
      .then(r => r.json())
      .then((d: AnalyticsData) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, period])

  // Skeleton only when no data has ever loaded
  if (loading && !data) return <AnalyticsSkeleton />
  if (!data) return null

  const maxLeakage = Math.max(...data.leakage.items.map(i => parseFloat(i.amount)), 1)
  const maxAging   = Math.max(...data.aging.map(b => parseFloat(b.amount)), 1)
  const col        = BAND_COLOR[data.quality.band] ?? BAND_COLOR.Fair
  const showVendors = data.vendors !== null

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

      {/* Panel 1 — ITC Leakage Breakdown */}
      <Panel title="ITC Leakage Breakdown">
        {data.leakage.items.length === 0 ? (
          <p className="text-sm text-slate-400">No leakage this period — great work!</p>
        ) : (
          <div className="space-y-3">
            {data.leakage.items.map(item => (
              <div key={item.cause}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">{item.cause}</span>
                  <span className="font-mono font-bold text-slate-800">{fmt(item.amount)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div
                    className={item.recoverable ? 'h-1.5 rounded-full bg-amber-400' : 'h-1.5 rounded-full bg-red-500'}
                    style={{ width: `${(parseFloat(item.amount) / maxLeakage) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[11px] text-slate-400">{item.count} invoice{item.count !== 1 ? 's' : ''}</span>
                  <span className={`text-[10px] font-semibold ${item.recoverable ? 'text-amber-600' : 'text-red-600'}`}>
                    {item.recoverable ? 'Recoverable' : 'Permanent loss'}
                  </span>
                </div>
              </div>
            ))}
            <div className={`mt-1 rounded-lg border p-3 ${col.bg} ${col.border}`}>
              <p className="text-xs font-semibold text-slate-700">
                Total recoverable ITC:{' '}
                <span className="font-mono text-emerald-700">{fmt(data.leakage.totalRecoverable)}</span>
              </p>
            </div>
          </div>
        )}
      </Panel>

      {/* Panel 2 — Quality Score */}
      <Panel title="Quality Score">
        <div className="flex items-start gap-4">
          <QualityCircle score={data.quality.score} band={data.quality.band} />
          <div className="flex-1 space-y-3">
            <SubScoreBar label="Auto-accept rate"  pct={data.quality.autoAcceptRate} />
            <SubScoreBar label="ITC recovery rate" pct={data.quality.itcRecoveryRate} />
            <SubScoreBar label="Deadline adherence" pct={data.quality.deadlineAdherence} />
          </div>
        </div>
        <div className={`rounded-lg border p-3 text-xs ${col.bg} ${col.border} ${col.text}`}>
          {ADVISORY[data.quality.band]}
        </div>
      </Panel>

      {/* Panel 3 — ITC Aging */}
      <Panel title="ITC Aging">
        {data.aging.every(b => b.count === 0) ? (
          <p className="text-sm text-slate-400">No unmatched invoices — all clear!</p>
        ) : (
          <div className="space-y-3">
            {data.aging.map(bucket => {
              const style = AGING_COLOR[bucket.bucket] ?? AGING_COLOR['0–30d']
              const pct = parseFloat(bucket.amount) / maxAging * 100
              return (
                <div key={bucket.bucket}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-semibold ${style.text}`}>{bucket.bucket}</span>
                    <span className="font-mono font-bold text-slate-800">{fmt(bucket.amount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className={`h-1.5 rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</p>
                </div>
              )
            })}
            {(() => {
              const over90 = data.aging.find(b => b.bucket === '90+')
              if (!over90 || parseFloat(over90.amount) === 0) return null
              return (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">
                    ⚠️ {fmt(over90.amount)} in ITC over 90 days old — at risk of time-bar under Section 16(4)
                  </p>
                  <p className="text-[11px] text-red-600">
                    Suppliers: {over90.suppliers.join(', ')}
                  </p>
                </div>
              )
            })()}
          </div>
        )}
      </Panel>

      {/* Panel 4 — Pre-14th Vendor List */}
      <Panel title={showVendors ? `Pre-14th Vendor List · ${14 - data.dayOfMonth}d to deadline` : 'Pre-14th Vendor List'}>
        {!showVendors ? (
          <p className="text-sm text-slate-400">
            Vendor list appears between the 10th and 13th of each month, before the GSTR-2B cutoff.
          </p>
        ) : data.vendors!.length === 0 ? (
          <p className="text-sm text-slate-400">No pending vendors — all invoices resolved!</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {['Supplier GSTIN', 'Invoice #', 'ITC at Risk', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {data.vendors!.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-700">{v.supplierGstin}</td>
                      <td className="px-3 py-2 text-slate-600">{v.invoiceNumber}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{fmt(v.amount)}</td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                          {OUTCOME_LABELS[v.outcome] ?? v.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportVendorCSV(data.vendors!, clientId)}
                className="text-xs font-medium text-slate-600 border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50 transition-colors"
              >
                Export Vendor List CSV
              </button>
              <button
                type="button"
                className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md px-3 py-1.5 transition-colors"
              >
                Send Reminders ({data.vendors!.length})
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
