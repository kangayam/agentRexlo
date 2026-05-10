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

  const summaryCards = [
    { key: 'ALL',             label: 'All Clients',      val: summary.total,          sub: 'Total active',             color: 'text-slate-900', dot: 'bg-slate-400' },
    { key: 'RECONCILED',      label: 'Fully Reconciled', val: summary.reconciled,     sub: 'Quality ≥ 75 this period', color: 'text-green-700', dot: 'bg-green-500' },
    { key: 'NEEDS_ATTENTION', label: 'Needs Attention',  val: summary.needsAttention, sub: 'Unmatched invoices',       color: 'text-amber-700', dot: 'bg-amber-500' },
    { key: 'NO_UPLOAD',       label: 'No Data Uploaded', val: summary.noUpload,       sub: 'Missing this period',      color: 'text-slate-600', dot: 'bg-slate-400' },
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

      {/* Status strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {summaryCards.map(card => (
          <button
            key={card.key}
            onClick={() => setFilter(card.key as 'ALL' | ClientStatus)}
            className={`text-left bg-white rounded-xl p-4 transition-all
                       ${activeFilter === card.key
                         ? 'border-2 border-slate-900 shadow-sm'
                         : 'border border-slate-200 hover:border-slate-300'
                       }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">{card.label}</span>
              <span className={`w-2 h-2 rounded-full ${card.dot}`} />
            </div>
            <p className={`text-2xl font-extrabold ${card.color}`}>{card.val}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </button>
        ))}
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
