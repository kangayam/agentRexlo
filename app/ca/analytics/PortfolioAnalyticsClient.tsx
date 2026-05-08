'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Download, Shield, AlertCircle, Users, BarChart2,
} from 'lucide-react'
import { formatINR } from '@/lib/format'

// ── Types ─────────────────────────────────────────────────────────────

export interface ClientAnalytic {
  clientId:     string
  clientName:   string
  gstin:        string
  period:       string
  itcCleared:   number
  itcAtRisk:    number
  itcBlocked:   number
  itcUnverified:number
  itcTotal:     number
  leakage: {
    supplierNotFiled: number
    valueMismatch:    number
    pendingReview:    number
  }
  totalLeakage: number
  leakagePct:   number
  qualScore:    number
  qualBand:     string
  aging: { d30: number; d60: number; d90: number; d90plus: number }
  trend: Array<{ period: string; itcCleared: number; itcAtRisk: number; qualScore: number }>
  trendDir: 'improving' | 'declining' | 'stable'
  lastUploadDate: string | null
}

interface PortfolioTotals {
  itcCleared:    number
  itcAtRisk:     number
  totalLeakage:  number
  avgQualScore:  number
  activeClients: number
}

interface TrendPoint {
  period:       string
  itcCleared:   number
  itcAtRisk:    number
  avgQualScore: number
}

interface Props {
  clientAnalytics:  ClientAnalytic[]
  portfolioTotals:  PortfolioTotals
  portfolioTrend:   TrendPoint[]
  portfolioLeakage: { supplierNotFiled: number; valueMismatch: number; pendingReview: number }
  portfolioAging:   { d30: number; d60: number; d90: number; d90plus: number }
  daysUntil14th:    number
}

// ── Helpers ───────────────────────────────────────────────────────────

const QUAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Excellent: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  Good:      { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200'   },
  Fair:      { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  Poor:      { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Critical:  { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200'    },
}

function periodLabel(period: string) {
  const [y, m] = period.split('-')
  return new Date(+y, +m - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
}

// ── Component ─────────────────────────────────────────────────────────

export function PortfolioAnalyticsClient({
  clientAnalytics,
  portfolioTotals,
  portfolioTrend,
  portfolioLeakage,
  portfolioAging,
  daysUntil14th,
}: Props) {
  const [sortBy, setSortBy] = useState<'risk' | 'leakage' | 'quality'>('risk')

  const itcChartRef   = useRef<HTMLCanvasElement>(null)
  const qualChartRef  = useRef<HTMLCanvasElement>(null)
  const leakChartRef  = useRef<HTMLCanvasElement>(null)
  const agingChartRef = useRef<HTMLCanvasElement>(null)
  const chartRefs     = useRef<any[]>([])

  // Load Chart.js from CDN once, reinitialise on data change
  useEffect(() => {
    function destroyAll() {
      chartRefs.current.forEach(c => { try { c.destroy() } catch {} })
      chartRefs.current = []
    }

    function initCharts() {
      const C = (window as any).Chart
      if (!C) return
      destroyAll()

      C.defaults.font.family = 'Inter, sans-serif'
      C.defaults.font.size   = 11

      const labels = portfolioTrend.map(p => periodLabel(p.period))

      const tickMoney = (v: number) =>
        v >= 100_000 ? `₹${Math.round(v / 100_000)}L` : `₹${Math.round(v / 1000)}K`

      if (itcChartRef.current) {
        chartRefs.current.push(new C(itcChartRef.current, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'ITC Cleared', data: portfolioTrend.map(p => p.itcCleared), backgroundColor: '#0D9488', stack: 'a' },
              { label: 'ITC At Risk', data: portfolioTrend.map(p => p.itcAtRisk),  backgroundColor: '#FCA5A5', stack: 'a' },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { color: '#64748B' } },
              y: { stacked: true, grid: { color: '#F1F5F9' }, ticks: { color: '#64748B', callback: tickMoney } },
            },
          },
        }))
      }

      if (qualChartRef.current) {
        chartRefs.current.push(new C(qualChartRef.current, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Avg Quality',
                data: portfolioTrend.map(p => p.avgQualScore),
                borderColor: '#0D9488', backgroundColor: 'rgba(13,148,136,0.08)',
                tension: 0.3, fill: true, pointBackgroundColor: '#0D9488', pointRadius: 4,
              },
              {
                label: 'Target (75)',
                data: portfolioTrend.map(() => 75),
                borderColor: '#CBD5E1', borderDash: [6, 4], borderWidth: 1.5,
                pointRadius: 0, fill: false,
              },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#64748B' } },
              y: { min: 0, max: 100, grid: { color: '#F1F5F9' }, ticks: { color: '#64748B' } },
            },
          },
        }))
      }

      if (leakChartRef.current) {
        chartRefs.current.push(new C(leakChartRef.current, {
          type: 'bar',
          data: {
            labels: ['Supplier not filed', 'Value mismatch', 'Pending review'],
            datasets: [{
              data: [portfolioLeakage.supplierNotFiled, portfolioLeakage.valueMismatch, portfolioLeakage.pendingReview],
              backgroundColor: ['#FCA5A5', '#FCD34D', '#86EFAC'],
              borderRadius: 4,
            }],
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: '#F1F5F9' }, ticks: { color: '#64748B', callback: tickMoney } },
              y: { grid: { display: false }, ticks: { color: '#64748B' } },
            },
          },
        }))
      }

      if (agingChartRef.current) {
        chartRefs.current.push(new C(agingChartRef.current, {
          type: 'doughnut',
          data: {
            labels: ['0–30 days', '31–60 days', '61–90 days', '90+ days'],
            datasets: [{
              data: [portfolioAging.d30, portfolioAging.d60, portfolioAging.d90, portfolioAging.d90plus],
              backgroundColor: ['#86EFAC', '#FCD34D', '#FCA5A5', '#EF4444'],
              borderWidth: 0, hoverOffset: 4,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            plugins: {
              legend: { position: 'right', labels: { font: { size: 10 }, color: '#64748B', boxWidth: 10, padding: 8 } },
            },
          },
        }))
      }
    }

    if ((window as any).Chart) {
      initCharts()
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-chartjs]')
      if (existing) {
        existing.addEventListener('load', initCharts)
        return () => { existing.removeEventListener('load', initCharts); destroyAll() }
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
      script.setAttribute('data-chartjs', '')
      script.onload = initCharts
      document.head.appendChild(script)
    }

    return destroyAll
  }, [portfolioTrend, portfolioLeakage, portfolioAging])

  const sortedClients = [...clientAnalytics].sort((a, b) => {
    if (sortBy === 'leakage') return b.leakagePct    - a.leakagePct
    if (sortBy === 'quality') return b.qualScore     - a.qualScore
    return b.totalLeakage - a.totalLeakage
  })

  return (
    <div className="px-8 py-6">

      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Portfolio Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Firm-wide ITC intelligence · Last 3 months ·{' '}
            {portfolioTotals.activeClients} client{portfolioTotals.activeClients !== 1 ? 's' : ''} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg
                             bg-white border border-slate-200 text-slate-700
                             text-xs font-medium hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Pre-14th alert */}
      {daysUntil14th >= 0 && daysUntil14th <= 8 && portfolioTotals.itcAtRisk > 0 && (
        <div className="mb-5 flex items-center justify-between
                        bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-800">
              <strong>Pre-14th alert:</strong> {daysUntil14th} days remaining ·{' '}
              ₹{formatINR(portfolioTotals.itcAtRisk)} ITC at risk across{' '}
              {portfolioTotals.activeClients} client{portfolioTotals.activeClients !== 1 ? 's' : ''}
            </span>
          </div>
          <Link href="/ca/alerts"
            className="text-xs text-red-600 font-semibold hover:underline flex-shrink-0">
            View Alerts →
          </Link>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { icon: Shield,      label: 'Total ITC Cleared', val: `₹${formatINR(portfolioTotals.itcCleared)}`, color: 'text-green-600' },
          { icon: AlertCircle, label: 'Total ITC At Risk',  val: `₹${formatINR(portfolioTotals.itcAtRisk)}`,  color: 'text-red-600'   },
          { icon: BarChart2,   label: 'Avg Quality Score',  val: `${portfolioTotals.avgQualScore} / 100`,      color: 'text-slate-900' },
          { icon: Users,       label: 'Active Clients',     val: String(portfolioTotals.activeClients),        color: 'text-slate-900' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <s.icon className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
            </div>
            <p className={`text-xl font-extrabold font-mono tracking-tight ${s.color}`}>
              {s.val}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">ITC Trend — Cleared vs At Risk</h3>
          <p className="text-xs text-slate-400 mb-3">Monthly · all clients combined</p>
          <div className="flex gap-3 mb-3">
            {[{ label: 'ITC Cleared', color: 'bg-teal-500' }, { label: 'ITC At Risk', color: 'bg-red-200' }].map((l, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                {l.label}
              </span>
            ))}
          </div>
          <div className="relative h-[180px]">
            {portfolioTrend.length === 0
              ? <p className="text-xs text-slate-400 text-center pt-16">No data yet</p>
              : <canvas ref={itcChartRef} />
            }
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Quality Score Trend</h3>
          <p className="text-xs text-slate-400 mb-3">Portfolio average · target 75 / Good</p>
          <div className="flex gap-3 mb-3">
            {[{ label: 'Portfolio avg', color: 'bg-teal-500' }, { label: 'Target (75)', color: 'bg-slate-200' }].map((l, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                {l.label}
              </span>
            ))}
          </div>
          <div className="relative h-[180px]">
            {portfolioTrend.length === 0
              ? <p className="text-xs text-slate-400 text-center pt-16">No data yet</p>
              : <canvas ref={qualChartRef} />
            }
          </div>
        </div>

      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Leakage Breakdown by Cause</h3>
          <p className="text-xs text-slate-400 mb-3">Cumulative across all clients</p>
          <div className="relative h-[160px]">
            {portfolioTotals.totalLeakage === 0
              ? <p className="text-xs text-slate-400 text-center pt-12">No leakage — all ITC matched ✓</p>
              : <canvas ref={leakChartRef} />
            }
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Portfolio ITC Aging</h3>
          <p className="text-xs text-slate-400 mb-3">Unrecovered ITC by age · all clients</p>
          <div className="relative h-[160px]">
            {portfolioTotals.totalLeakage === 0
              ? <p className="text-xs text-slate-400 text-center pt-12">No unrecovered ITC</p>
              : <canvas ref={agingChartRef} />
            }
          </div>
          {portfolioAging.d90plus > 0 && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
              ⚠ ₹{formatINR(portfolioAging.d90plus)} is over 90 days old — permanent loss risk.
              Contact affected clients immediately.
            </div>
          )}
        </div>

      </div>

      {/* Client rankings table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Client Rankings</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click a client to open their analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sort by:</span>
            {([
              { key: 'risk',    label: '₹ At Risk'      },
              { key: 'leakage', label: 'Leakage %'      },
              { key: 'quality', label: 'Quality Score'  },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors
                           ${sortBy === opt.key
                             ? 'bg-slate-900 text-white'
                             : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                           }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-48" />
            <col className="w-36" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100">
              {['#', 'Client', 'Quality Score', 'ITC Cleared', 'ITC At Risk', 'Leakage %', 'Last Upload', '3M Trend'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedClients.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                  No client data available yet. Add clients and upload data to see analytics.
                </td>
              </tr>
            ) : sortedClients.map((c, i) => {
              const qc = QUAL_COLORS[c.qualBand] ?? { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' }
              return (
                <tr key={c.clientId}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/ca/clients/${c.clientId}?tab=analytics`}
                          className="font-semibold text-sm text-slate-900 hover:text-blue-600 block truncate">
                      {c.clientName}
                    </Link>
                    <span className="font-mono text-[10px] text-slate-400 truncate block">
                      {c.gstin}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold
                                     px-2.5 py-1 rounded-full border
                                     ${qc.bg} ${qc.text} ${qc.border}`}>
                      {c.qualBand} · {c.qualScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold font-mono text-green-600">
                    ₹{formatINR(c.itcCleared)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold font-mono text-red-600">
                    ₹{formatINR(c.totalLeakage)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-700">{c.leakagePct}%</div>
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full"
                           style={{ width: `${Math.min(100, c.leakagePct)}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.lastUploadDate
                      ? new Date(c.lastUploadDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
                      : '—'
                    }
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="text-green-600 text-[10px]">Complete</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.trendDir === 'improving' ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <TrendingUp className="w-3.5 h-3.5" /> Improving
                      </span>
                    ) : c.trendDir === 'declining' ? (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <TrendingDown className="w-3.5 h-3.5" /> Declining
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        <Minus className="w-3.5 h-3.5" /> Stable
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
