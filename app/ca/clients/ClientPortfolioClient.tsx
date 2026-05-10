'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, Send, BarChart2, Upload } from 'lucide-react'
import { formatINR } from '@/lib/format'

type ClientStatus = 'RECONCILED' | 'NEEDS_ATTENTION' | 'URGENT' | 'NO_UPLOAD'

type ClientRow = {
  clientId:     string
  clientName:   string
  gstin:        string
  state:        string
  status:       ClientStatus
  qualScore:    number | null
  qualBand:     string | null
  itcCleared:   number
  itcAtRisk:    number
  period:       string | null
  periodStatus: string | null
  lastUpload:   string | null
}

const statusConfig = {
  RECONCILED:      { label: 'Reconciled',      bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500'  },
  NEEDS_ATTENTION: { label: 'Needs Attention', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500'  },
  URGENT:          { label: 'Urgent',          bg: 'bg-red-50',   text: 'text-red-700',   dot: 'bg-red-500'    },
  NO_UPLOAD:       { label: 'No Upload',       bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400'  },
}

const qualConfig: Record<string, string> = {
  Excellent: 'bg-green-50 text-green-700',
  Good:      'bg-teal-50 text-teal-700',
  Fair:      'bg-amber-50 text-amber-700',
  Poor:      'bg-orange-50 text-orange-700',
  Critical:  'bg-red-50 text-red-600',
}

function PeriodBadge({ status, period }: { status: string | null; period: string | null }) {
  if (!period) {
    return <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">No data</span>
  }
  const label = period.replace(/^(\d{4})-(\d{2})$/, (_, y, m) =>
    new Date(+y, +m - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' }))
  if (status === 'done')
    return <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{label} · Done</span>
  if (status === 'processing')
    return <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{label} · Processing</span>
  return <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{label} · Pending</span>
}

export function ClientPortfolioClient({
  clientRows,
  summary,
}: {
  clientRows: ClientRow[]
  summary: {
    total: number
    reconciled: number
    needsAttention: number
    urgent: number
    noUpload: number
  }
}) {
  const router = useRouter()
  const [search, setSearch]       = useState('')
  const [activeFilter, setFilter] = useState<'ALL' | ClientStatus>('ALL')
  const [sending, setSending]     = useState<string | null>(null)
  const [sent, setSent]           = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return clientRows.filter(c => {
      const matchesFilter = activeFilter === 'ALL' || c.status === activeFilter
      const q = search.toLowerCase()
      const matchesSearch = !q
        || c.clientName.toLowerCase().includes(q)
        || c.gstin.toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [clientRows, activeFilter, search])

  const handleSendReminder = async (clientId: string) => {
    setSending(clientId)
    try {
      await fetch('/api/ca/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      setSent(prev => new Set([...prev, clientId]))
    } catch (err) {
      console.error(err)
    }
    setSending(null)
  }

  const filterTabs = [
    { key: 'ALL',             label: `All (${summary.total})`                          },
    { key: 'URGENT',          label: `Urgent (${summary.urgent})`                      },
    { key: 'NEEDS_ATTENTION', label: `Needs Attention (${summary.needsAttention})`     },
    { key: 'RECONCILED',      label: `Reconciled (${summary.reconciled})`              },
    { key: 'NO_UPLOAD',       label: `No Upload (${summary.noUpload})`                 },
  ]

  return (
    <div className="px-8 py-6">

      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Client Portfolio
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            All clients managed by your firm
          </p>
        </div>
        <button
          onClick={() => router.push('/ca/clients/new')}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg
                     bg-slate-900 text-white text-sm font-medium
                     hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Client ITC Status Distribution */}
      <div className="bg-white border border-slate-200 rounded-xl
                      p-6 mb-5 flex items-center gap-8">

        {/* Left: donut ring */}
        <div className="flex-shrink-0 relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* Background ring */}
            <circle
              cx="60" cy="60" r="48"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="12"
            />
            {/* Segments — computed from summary counts */}
            {(() => {
              const total = summary.total || 1
              const circumference = 2 * Math.PI * 48

              const segments = [
                { count: summary.reconciled,     color: '#10B981' },
                { count: summary.needsAttention, color: '#F59E0B' },
                { count: summary.urgent,         color: '#EF4444' },
                { count: summary.noUpload,       color: '#CBD5E1' },
              ]

              let offset = 0
              return segments.map((seg, i) => {
                const pct  = seg.count / total
                const dash = pct * circumference
                const gap  = circumference - dash
                const el   = (
                  <circle
                    key={i}
                    cx="60" cy="60" r="48"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="12"
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                )
                offset += dash
                return el
              })
            })()}
          </svg>
          {/* Centre label */}
          <div className="absolute inset-0 flex flex-col items-center
                          justify-center pointer-events-none">
            <span className="text-2xl font-extrabold text-slate-900 leading-none">
              {summary.total}
            </span>
            <span className="text-[10px] font-semibold text-slate-400
                             uppercase tracking-wider mt-0.5">
              Total
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-24 w-px bg-slate-100 flex-shrink-0" />

        {/* Right: 4 category breakdown in 2x2 grid */}
        <div className="flex-1 grid grid-cols-2 gap-x-12 gap-y-5">
          {[
            {
              label: 'Fully Reconciled',
              count: summary.reconciled,
              color: 'bg-green-500',
              textColor: 'text-green-700',
              onClick: () => setFilter('RECONCILED'),
            },
            {
              label: 'Needs Attention',
              count: summary.needsAttention,
              color: 'bg-amber-400',
              textColor: 'text-amber-700',
              onClick: () => setFilter('NEEDS_ATTENTION'),
            },
            {
              label: 'Urgent — Pre-14th',
              count: summary.urgent,
              color: 'bg-red-500',
              textColor: 'text-red-700',
              onClick: () => setFilter('URGENT'),
            },
            {
              label: 'No Data Uploaded',
              count: summary.noUpload,
              color: 'bg-slate-300',
              textColor: 'text-slate-600',
              onClick: () => setFilter('NO_UPLOAD'),
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="flex items-center gap-3 text-left group"
            >
              <div className={`w-1 h-10 rounded-full flex-shrink-0 ${item.color}`} />
              <div>
                <p className="text-xs text-slate-500 font-medium group-hover:text-slate-700
                              transition-colors">
                  {item.label}
                </p>
                <p className={`text-xl font-extrabold mt-0.5 ${item.textColor}`}>
                  {item.count}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    Client{item.count !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Download report — top right corner */}
        <div className="self-start flex-shrink-0">
          <button className="flex items-center gap-1.5 text-xs text-slate-500
                             hover:text-slate-700 font-medium transition-colors">
            Download Report
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search + filter toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name or GSTIN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 text-sm border border-slate-200
                       rounded-lg bg-white text-slate-900 placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-slate-900/10
                       focus:border-slate-400"
          />
        </div>
        <div className="flex gap-1.5">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as 'ALL' | ClientStatus)}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors
                         whitespace-nowrap
                         ${activeFilter === tab.key
                           ? 'bg-slate-900 text-white'
                           : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                         }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Client', 'Status', 'Quality Score', 'ITC Cleared', 'ITC At Risk', 'Period', 'Last Upload', 'Actions'].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-semibold
                             text-slate-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-400">
                  {search
                    ? `No clients found matching "${search}"`
                    : 'No clients in this category yet.'
                  }
                </td>
              </tr>
            ) : filtered.map(c => {
              const sc       = statusConfig[c.status]
              const qc       = c.qualBand ? qualConfig[c.qualBand] : ''
              const isSent    = sent.has(c.clientId)
              const isSending = sending === c.clientId

              return (
                <tr
                  key={c.clientId}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  {/* Client name */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/ca/clients/${c.clientId}?tab=analytics`}
                      className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors block"
                    >
                      {c.clientName}
                    </Link>
                    <span className="font-mono text-[10px] text-slate-400">
                      {c.gstin} · {c.state}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium
                                     px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </td>

                  {/* Quality score */}
                  <td className="px-4 py-3">
                    {c.qualScore !== null ? (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${qc}`}>
                        {c.qualBand} · {c.qualScore}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* ITC Cleared */}
                  <td className="px-4 py-3 text-sm font-semibold font-mono text-green-600">
                    {c.itcCleared > 0 ? `₹${formatINR(c.itcCleared)}` : '—'}
                  </td>

                  {/* ITC At Risk */}
                  <td className="px-4 py-3 text-sm font-semibold font-mono text-red-600">
                    {c.itcAtRisk > 0 ? `₹${formatINR(c.itcAtRisk)}` : '—'}
                  </td>

                  {/* Period */}
                  <td className="px-4 py-3">
                    <PeriodBadge status={c.periodStatus} period={c.period} />
                  </td>

                  {/* Last upload */}
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.lastUpload
                      ? new Date(c.lastUpload).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: '2-digit',
                        })
                      : '—'
                    }
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/ca/clients/${c.clientId}?tab=analytics`}
                        className="inline-flex items-center gap-1 h-7 px-2.5
                                   rounded-md border border-slate-200 text-xs
                                   font-medium text-slate-700 bg-white
                                   hover:bg-slate-50 transition-colors"
                      >
                        <BarChart2 className="w-3 h-3" />
                        Analytics
                      </Link>

                      {c.status === 'NO_UPLOAD' ? (
                        <Link
                          href={`/ca/clients/${c.clientId}/upload`}
                          className="inline-flex items-center gap-1 h-7 px-2.5
                                     rounded-md border border-blue-200 text-xs
                                     font-medium text-blue-700 bg-blue-50
                                     hover:bg-blue-100 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          Upload
                        </Link>
                      ) : (c.status === 'URGENT' || c.status === 'NEEDS_ATTENTION') && (
                        <button
                          onClick={() => handleSendReminder(c.clientId)}
                          disabled={isSent || isSending}
                          className={`inline-flex items-center gap-1 h-7 px-2.5
                                     rounded-md text-xs font-medium transition-colors
                                     ${isSent
                                       ? 'border border-green-200 text-green-700 bg-green-50 cursor-default'
                                       : 'border border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                                     }`}
                        >
                          <Send className="w-3 h-3" />
                          {isSending ? 'Sending…' : isSent ? '✓ Sent' : 'Remind'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Showing {filtered.length} of {clientRows.length} client{clientRows.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-slate-400">
            {summary.urgent > 0 && (
              <span className="text-red-600 font-medium">
                {summary.urgent} urgent — pre-14th deadline approaching
              </span>
            )}
          </span>
        </div>
      </div>

    </div>
  )
}
