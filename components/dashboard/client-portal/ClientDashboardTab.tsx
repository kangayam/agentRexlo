'use client'

import { Check, ExternalLink } from 'lucide-react'
import { ClientMarkDoneButton } from './ClientMarkDoneButton'
import { formatINR } from '@/lib/format'
import type { ReconResult, ComputedDashboard } from './types'

function getAction(r: ReconResult): {
  title: string; desc: string; tag: string; color: 'red' | 'amber' | 'blue'
} {
  if (r.result === 'NOT_IN_BOOKS')
    return {
      title: 'Verify this invoice with your accountant before accepting',
      desc:  `Invoice ${r.invoiceNo} appears in GSTN but is NOT found in your Tally purchase books. Do NOT accept it on GSTN until your accountant confirms this is a genuine purchase.`,
      tag:   'Verify with accountant',
      color: 'blue',
    }
  if (r.result === 'AUTO_REJECTED')
    return {
      title: "Reject this invoice on GSTN — value doesn't match your records",
      desc:  `Supplier filed a different amount than your Tally records. Go to GSTN → IMS tab → find invoice ${r.invoiceNo} → click Reject.`,
      tag:   'Reject on GSTN',
      color: 'red',
    }
  return {
    title: 'Review and accept this invoice on GSTN',
    desc:  `Invoice ${r.invoiceNo} appears in GSTR-2B. Go to GSTN → IMS tab → find this invoice → click Accept to claim your ITC.`,
    tag:   'Accept on GSTN',
    color: 'amber',
  }
}

interface Props {
  computed:    ComputedDashboard
  onToggleDone: (resultId: string, isDone: boolean) => void
}

export function ClientDashboardTab({ computed, onToggleDone }: Props) {
  const { itcSafe, itcAtRisk, itcBlocked, itcUnverified, actionQueue, completed } = computed

  return (
    <div>
      {/* ITC summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl p-4 bg-green-50 border border-green-200">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">ITC Safe</p>
          <p className="text-xl font-extrabold text-green-700 font-mono">₹{formatINR(itcSafe)}</p>
          <p className="text-xs text-green-600 font-medium mt-1">Auto-matched invoices ✓</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-50 border border-amber-200">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">ITC At Risk</p>
          <p className="text-xl font-extrabold text-amber-700 font-mono">₹{formatINR(itcAtRisk)}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">
            {actionQueue.filter(r => r.result === 'PENDING_REVIEW').length} invoices need your action
          </p>
        </div>
        <div className="rounded-xl p-4 bg-red-50 border border-red-200">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">ITC Blocked</p>
          <p className="text-xl font-extrabold text-red-700 font-mono">₹{formatINR(itcBlocked)}</p>
          <p className="text-xs text-red-600 font-medium mt-1">
            {actionQueue.filter(r => r.result === 'AUTO_REJECTED').length} invoices rejected
          </p>
        </div>
        <div className="rounded-xl p-4 bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">ITC Unverified</p>
          <p className="text-xl font-extrabold text-slate-600 font-mono">₹{formatINR(itcUnverified)}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Check with your accountant</p>
        </div>
      </div>

      {/* Action queue header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Your Action Queue</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete these on GSTN to protect your ITC · Sorted by ₹ impact
          </p>
        </div>
        <a
          href="https://www.gst.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg
                     bg-white border border-slate-200 text-slate-600
                     text-xs font-medium hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open GSTN Portal
        </a>
      </div>

      {actionQueue.length === 0 && (
        <div className="py-12 text-center bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-semibold text-green-700">All invoices matched — nothing to action!</p>
          <p className="text-xs text-green-600 mt-1">Your ITC is fully protected this period.</p>
        </div>
      )}

      {/* Action cards */}
      <div className="flex flex-col gap-2.5">
        {actionQueue.map((r, i) => {
          const action = getAction(r)
          const isRed   = action.color === 'red'
          const isBlue  = action.color === 'blue'
          return (
            <div
              key={r.id}
              className={`bg-white border rounded-xl p-4 flex items-start gap-3
                ${isRed
                  ? 'border-l-[3px] border-l-red-500 border-slate-200 bg-red-50/30'
                  : isBlue
                    ? 'border-l-[3px] border-l-blue-500 border-slate-200'
                    : 'border-l-[3px] border-l-amber-400 border-slate-200'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center
                              text-xs font-bold flex-shrink-0 mt-0.5
                              ${isRed ? 'bg-red-50 text-red-600' : isBlue ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 mb-1">{action.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{action.desc}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {r.supplierGstin} · {r.invoiceNo}
                  </span>
                  <span className={`text-xs font-bold font-mono
                                   ${isRed ? 'text-red-600' : isBlue ? 'text-blue-600' : 'text-amber-600'}`}>
                    ₹{formatINR(r.itcAtRisk)} {isBlue ? 'unverified' : 'at risk'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full
                  ${isRed ? 'bg-red-50 text-red-600' : isBlue ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {action.tag}
                </span>
                <ClientMarkDoneButton
                  resultId={r.id}
                  isDone={r.isDone}
                  onToggle={onToggleDone}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Completed section */}
      {completed.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Matched · {completed.length} invoices
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          {completed.slice(0, 3).map(r => (
            <div
              key={r.id}
              className="flex items-center gap-3 bg-slate-50 border
                         border-slate-100 rounded-lg px-4 py-2.5 mb-2"
            >
              <div className="w-5 h-5 rounded-full bg-green-50 border
                              border-green-200 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-xs text-slate-500 flex-1">
                {r.supplierGstin} · {r.invoiceNo} — ₹{formatINR(r.itcAtRisk)} ITC secured
              </span>
              <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Matched
              </span>
            </div>
          ))}
          {completed.length > 3 && (
            <p className="text-xs text-slate-400 text-center mt-1">
              + {completed.length - 3} more matched invoices
            </p>
          )}
        </div>
      )}
    </div>
  )
}
