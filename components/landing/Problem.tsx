'use client'

import { useFadeIn } from '@/hooks/useFadeIn'

const cards = [
  {
    title: 'GST Filing Fees Under Pressure',
    points: [
      'Automation is reducing the perceived value of compliance work',
      'Margins shrinking despite rising workload and complexity',
      'Clients expect more for less every year',
    ],
  },
  {
    title: 'Advisory Is High-Margin but Hard to Scale',
    points: [
      'Valuable insights require 1–2 days of manual review per client',
      'Growth is tied to human capacity, not technology',
      'Revenue ceiling hit without growing headcount',
    ],
  },
]

export function Problem() {
  const ref = useFadeIn()

  return (
    <section id="features" className="bg-[#f8fafc] py-24 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">

        {/* Label */}
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#00bfad] mb-4">
          The Problem
        </p>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0f172a] leading-tight mb-4 max-w-3xl">
          Tax Filing Is Becoming a Commodity. Advisory Is the Future.
        </h2>

        <p className="text-base italic text-[#64748b] mb-12 max-w-2xl">
          CA firms that don&apos;t build advisory capability risk long-term commoditization.
        </p>

        {/* Two cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {cards.map(card => (
            <div key={card.title}
                 className="rounded-xl border border-amber-200 bg-white p-6
                            shadow-sm shadow-amber-100/50">
              <h3 className="text-base font-bold text-[#0f172a] mb-4">{card.title}</h3>
              <ul className="space-y-3">
                {card.points.map(pt => (
                  <li key={pt} className="flex items-start gap-3 text-sm text-[#64748b]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Callout */}
        <div className="rounded-xl border border-[#00bfad]/40 bg-[#00bfad]/5 px-8 py-6 text-center">
          <p className="text-base sm:text-lg font-bold text-[#0f172a] leading-relaxed">
            What if you could productize and scale high-margin advisory across every client
            — with AI?
          </p>
        </div>

      </div>
    </section>
  )
}
