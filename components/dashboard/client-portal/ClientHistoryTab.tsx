'use client'

import type { FilingPeriod } from './types'
import { formatPeriod } from '@/lib/format'

const STATUS_STYLES: Record<string, string> = {
  done:       'bg-emerald-100 text-emerald-800',
  pending:    'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  failed:     'bg-red-100 text-red-800',
}

interface Props {
  periods: FilingPeriod[]
}

export function ClientHistoryTab({ periods }: Props) {
  const latest = periods[0]
  const missingTally = latest && latest.status === 'pending' && !latest.tallyUploadedAt

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Reconciliation History</h2>
          <p className="text-xs text-slate-400 mt-0.5">All periods for your GSTIN</p>
        </div>
      </div>

      {periods.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No uploads yet.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                {['Period', 'GSTIN', 'Status', 'IMS Uploaded', 'Tally Uploaded', 'Uploaded By', 'Results'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-sm text-slate-900">
                    {formatPeriod(p.period)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.gstin}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium
                      ${STATUS_STYLES[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.imsUploadedAt ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.tallyUploadedAt ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.uploadedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {p.matched + p.rejected + p.review + p.notInBooks === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {p.matched  > 0 && <span className="font-semibold text-emerald-700">{p.matched} matched</span>}
                        {p.rejected > 0 && <span className="font-semibold text-red-600">{p.rejected} rejected</span>}
                        {p.review   > 0 && <span className="font-semibold text-amber-600">{p.review} review</span>}
                        {p.notInBooks > 0 && <span className="font-semibold text-slate-500">{p.notInBooks} not in books</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {missingTally && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {formatPeriod(latest.period)} — Tally data not uploaded yet
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Upload your Tally purchase register to complete reconciliation for this period.
            </p>
          </div>
          <a
            href="/client/upload"
            className="flex-shrink-0 ml-4 h-9 px-4 rounded-lg bg-amber-600 text-white
                       text-sm font-semibold hover:bg-amber-700 transition-colors
                       flex items-center gap-1.5"
          >
            Upload Tally →
          </a>
        </div>
      )}
    </div>
  )
}
