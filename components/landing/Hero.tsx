'use client'

import { useFadeIn } from '@/hooks/useFadeIn'

const stats = [
  { value: '5×',    label: 'ROI in Month 1'              },
  { value: '+₹36L', label: 'Annual Revenue Uplift'        },
  { value: '3×',    label: 'Client Capacity, Same Team'   },
]

export function Hero() {
  const ref = useFadeIn()

  return (
    <section className="min-h-screen bg-[#0f1629] flex flex-col items-center justify-center
                        px-6 pt-24 pb-20">
      <div ref={ref} className="max-w-4xl mx-auto text-center w-full">

        {/* Pilot badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                        bg-amber-500/10 border border-amber-500/30 text-amber-400
                        text-xs font-bold mb-8 tracking-wide">
          🚀 Now accepting CA Pilot Partners — 30 spots remaining
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white
                       leading-[1.08] tracking-tight mb-6">
          Turn GST Compliance Into<br />
          <span className="text-[#00bfad]">Your Biggest Revenue Driver</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI agents that help CA firms double revenue per client and triple client
          capacity — while delivering branded advisory to every client, automatically.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-5">
          <a href="#cta"
             className="px-8 py-4 rounded-xl bg-[#00bfad] text-white font-bold text-base
                        hover:bg-[#00a89a] transition-colors shadow-lg shadow-teal-900/30">
            Join Pilot Program
          </a>
          <a href="#how-it-works"
             className="px-8 py-4 rounded-xl border border-white/20 text-white font-semibold
                        text-base hover:bg-white/5 transition-colors">
            See How It Works
          </a>
        </div>

        {/* Trust line */}
        <p className="text-xs text-slate-500 mb-16">
          30-day free pilot · No credit card · Cancel anytime
        </p>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-white/10 rounded-2xl overflow-hidden">
          {stats.map((s, i) => (
            <div key={s.label}
                 className={`px-8 py-7 text-center
                   ${i < stats.length - 1
                     ? 'border-b sm:border-b-0 sm:border-r border-white/10'
                     : ''}`}>
              <div className="text-4xl font-extrabold text-[#00bfad] mb-1">{s.value}</div>
              <div className="text-sm text-slate-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
