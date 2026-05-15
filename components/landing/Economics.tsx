'use client'

import { useFadeIn } from '@/hooks/useFadeIn'

const tableRows = [
  { label: 'Revenue / client',  today: '₹8,000 / mo',         after: '₹17,000 / mo'              },
  { label: 'Clients managed',   today: '40',                   after: '80–100'                     },
  { label: 'Monthly revenue',   today: '₹3.2L',               after: '₹6.8L+'                     },
  { label: 'Billing model',     today: 'Filing volume',        after: 'Compliance + Advisory'      },
  { label: 'Junior staff',      today: 'Burns out on Excel',   after: 'Learns & grows'             },
]

const statCards = [
  { value: '5×',    label: 'ROI on platform in Month 1',    color: 'text-[#00bfad]' },
  { value: '+₹36L', label: 'Annual practice revenue uplift', color: 'text-[#6366f1]' },
  { value: '3×',    label: 'Client capacity with same team', color: 'text-[#00bfad]' },
  { value: '₹60K',  label: 'Platform cost for 40 GSTINs/mo', color: 'text-[#64748b]' },
]

export function Economics() {
  const ref = useFadeIn()

  return (
    <section id="pricing" className="bg-[#f8fafc] py-24 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">

        {/* Header */}
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#00bfad] mb-4">
          The Economics
        </p>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0f172a] mb-4 leading-tight">
          What This Looks Like in Your P&amp;L
        </h2>
        <p className="text-base text-[#64748b] mb-14 max-w-2xl">
          A 40-client CA firm. The math is straightforward — and it compounds every quarter
          as advisory retainers replace filing fees.
        </p>

        <div className="flex flex-col lg:flex-row gap-10">

          {/* Comparison table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase
                                 tracking-wider w-1/3" />
                  <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider
                                 text-red-600 bg-red-50 rounded-tl-xl w-1/3">
                    Today
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider
                                 text-[#00bfad] bg-teal-50/50 rounded-tr-xl w-1/3">
                    With AgentGST
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-4 text-sm font-medium text-[#0f172a]">{row.label}</td>
                    <td className="py-3 px-4 text-sm text-center text-[#64748b] bg-red-50/30">
                      {row.today}
                    </td>
                    <td className="py-3 px-4 text-sm text-center font-bold text-[#00bfad] bg-teal-50/30">
                      {row.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-xs italic text-[#64748b] mt-4 px-1 leading-relaxed">
              Assumptions: 40-client firm · ₹8K/client/month current billing ·
              ₹1,500/GSTIN/month platform fee · Advisory uplift based on pilot data
            </p>
          </div>

          {/* Stat cards */}
          <div className="lg:w-72 grid grid-cols-2 gap-4 content-start">
            {statCards.map(card => (
              <div key={card.label}
                   className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm text-center">
                <div className={`text-3xl font-extrabold mb-1 ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-xs text-[#64748b] leading-snug font-medium">
                  {card.label}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
