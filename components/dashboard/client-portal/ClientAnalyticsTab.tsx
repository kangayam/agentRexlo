'use client'

import { formatINR } from '@/lib/format'
import type { ComputedDashboard } from './types'

const BAND_COLOR: Record<string, { ring: string; text: string; bg: string; border: string }> = {
  Excellent: { ring: '#10B981', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Good:      { ring: '#14B8A6', text: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200'    },
  Fair:      { ring: '#F59E0B', text: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
  Poor:      { ring: '#F97316', text: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200'  },
  Critical:  { ring: '#EF4444', text: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200'     },
}

interface Props {
  computed: ComputedDashboard
}

export function ClientAnalyticsTab({ computed }: Props) {
  const { leakage, itcAtRisk, aging, qualityScore, qualityBand } = computed
  const col = BAND_COLOR[qualityBand] ?? BAND_COLOR.Fair

  const totalLeakage = leakage.supplierNotFiled + leakage.valueMismatch + leakage.pendingReview
  const pct = (v: number) => totalLeakage > 0 ? Math.round((v / totalLeakage) * 100) : 0

  const leakageItems = [
    {
      label:  "Supplier didn't file GSTR-1",
      amount: leakage.supplierNotFiled,
      note:   'Call these suppliers and ask them to file · Recoverable',
      color:  '#ef4444',
    },
    {
      label:  'Value mismatch on invoices',
      amount: leakage.valueMismatch,
      note:   'Amounts differ between GSTN and your books · Recoverable after correction',
      color:  '#f59e0b',
    },
    {
      label:  'Invoices pending review on GSTN',
      amount: leakage.pendingReview,
      note:   'Accept these on GSTN → IMS tab to claim ITC',
      color:  '#f59e0b',
    },
  ].filter(i => i.amount > 0)

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Leakage breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900">
            Why is ₹{formatINR(itcAtRisk)} at risk?
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">
            Plain English breakdown of your ITC leakage this period
          </p>

          {leakageItems.length === 0 ? (
            <p className="text-sm text-slate-400">No leakage this period — great work!</p>
          ) : (
            <>
              {leakageItems.map((item, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-800">{item.label}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: item.color }}>
                      ₹{formatINR(item.amount)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct(item.amount)}%`, background: item.color }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{item.note}</p>
                </div>
              ))}

              <div className="mt-3 p-2.5 bg-green-50 rounded-lg border border-green-200 flex justify-between items-center">
                <span className="text-xs text-green-700 font-medium">Total recoverable if you act now</span>
                <span className="text-sm font-extrabold font-mono text-green-700">
                  ₹{formatINR(itcAtRisk)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Quality score */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900">Your GST Health Score</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">
            How well your GST reconciliation is managed this period
          </p>

          {(() => {
            const SUBTITLE: Record<string, string> = {
              Excellent: 'Your score is Excellent — ITC claims are well-protected this period.',
              Good:      'Your score is Good — review pending items to reach Excellent.',
              Fair:      'Your score is Fair — act on flagged invoices to improve.',
              Poor:      'Your score is Poor — high leakage risk, prioritise supplier follow-ups.',
              Critical:  'Your score is Critical — immediate action required to prevent ITC loss.',
            }
            const ADVICE: Record<string, { heading: string; tips: string[] }> = {
              Excellent: {
                heading: '🎉 Excellent score — keep it up!',
                tips: [
                  'Continue uploading Tally data before the 10th each month',
                  'Maintain your supplier follow-up routine',
                  'Complete GSTN actions within 3 days of each upload',
                ],
              },
              Good: {
                heading: '✓ Good score — here\'s how to reach Excellent',
                tips: [
                  'Upload Tally data before the 10th of each month (+14 pts)',
                  'Complete all GSTN actions within 3 days of upload (+8 pts)',
                  "Follow up with suppliers who haven't filed (+5 pts)",
                ],
              },
              Fair: {
                heading: '💡 Fair score — here\'s how to improve',
                tips: [
                  'Upload Tally data before the 10th of each month (+14 pts)',
                  'Complete all GSTN actions within 3 days of upload (+8 pts)',
                  "Follow up with suppliers who haven't filed (+5 pts)",
                ],
              },
            }
            const advice = ADVICE[qualityBand] ?? {
              heading: '⚠ Score needs attention — priority actions',
              tips: [
                'Upload Tally data immediately — even late upload helps (+14 pts)',
                'Complete all pending GSTN actions today (+8 pts)',
                "Contact suppliers who haven't filed their GSTR-1 urgently (+5 pts)",
              ],
            }
            return (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-full border-[3px] flex flex-col
                                  items-center justify-center flex-shrink-0
                                  ${col.bg} ${col.border}`}>
                    <span className={`text-xl font-extrabold font-mono leading-none ${col.text}`}>
                      {qualityScore}
                    </span>
                    <span className={`text-[9px] font-semibold uppercase mt-0.5 ${col.text}`}>
                      {qualityBand}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {SUBTITLE[qualityBand] ?? SUBTITLE.Critical}
                  </p>
                </div>

                <div className={`rounded-lg border p-3 ${col.bg} ${col.border}`}>
                  <p className={`text-xs font-semibold mb-2 ${col.text}`}>
                    {advice.heading}
                  </p>
                  {advice.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-current opacity-60 ${col.text}`} />
                      <span className={`text-xs ${col.text}`}>{tip}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Aging */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900">How old is your unrecovered ITC?</h3>
        <p className="text-xs text-slate-400 mt-0.5 mb-4">
          Older ITC has a higher risk of permanent loss
        </p>

        <div className="grid grid-cols-4 gap-3">
          {([
            { label: 'Fresh · 0–30 days',   val: aging.d30,     bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  note: 'Low risk'               },
            { label: 'Ageing · 31–60 days', val: aging.d60,     bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  note: 'Follow up'              },
            { label: 'Old · 61–90 days',    val: aging.d90,     bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', note: 'Act now'                },
            { label: 'Critical · 90+ days', val: aging.d90plus, bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    note: 'Risk of permanent loss' },
          ] as const).map((b, i) => (
            <div key={i} className={`${b.bg} border ${b.border} rounded-lg p-3 text-center`}>
              <p className={`text-[9px] font-bold uppercase tracking-wide ${b.text} mb-2`}>
                {b.label}
              </p>
              <p className={`text-base font-extrabold font-mono ${b.text}`}>
                {b.val > 0 ? `₹${formatINR(b.val)}` : '—'}
              </p>
              <p className={`text-[10px] mt-1 ${b.text} opacity-75`}>{b.note}</p>
            </div>
          ))}
        </div>

        {aging.d90plus > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 font-medium">
              ⚠ ₹{formatINR(aging.d90plus)} is over 90 days old — contact your CA immediately
              to prevent permanent ITC loss under Section 16(4).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
