'use client'

import Image from 'next/image'
import { useFadeIn } from '@/hooks/useFadeIn'

const stats = [
  { value: '5×',    label: 'ROI in Month 1'            },
  { value: '+₹36L', label: 'Annual Revenue Uplift'      },
  { value: '3×',    label: 'Client Capacity, Same Team' },
]

export function Hero() {
  const ref = useFadeIn()

  return (
    <section className="min-h-screen bg-[#F4F9FB] flex flex-col justify-center pt-16">
      <div
        ref={ref}
        className="max-w-7xl mx-auto w-full px-6 py-20
                   grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14
                   items-center"
      >

        {/* ── LEFT ── */}
        <div className="flex flex-col">

          {/* Pilot badge — 13px / semibold / tracking 0.02em */}
          <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-md
                          bg-amber-50 border border-amber-300 text-amber-800
                          text-[13px] font-semibold mb-6 tracking-[0.02em]">
            🚀 Now accepting CA Pilot Partners — 30 spots remaining
          </div>

          {/* Super headline — 56px→64px / black 900 / leading 1.1 / tracking -0.04em */}
          <h1 className="text-[56px] lg:text-[64px] font-black text-[#0d1f2d]
                         leading-[1.1] tracking-[-0.04em] mb-5 max-w-lg">
            Turn GST Compliance Into Your Biggest Revenue Driver
          </h1>

          {/* Sub-headline — 20px / medium 500 / leading 1.5 / gray-600 */}
          <p className="text-[20px] text-gray-600 font-medium
                        max-w-xl mb-8 leading-[1.5]">
            AI agents handle IMS reconciliation, ITC recovery, and client reports —
            so your firm earns more from every client without working more hours.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <a href="#cta"
               className="px-7 py-3.5 rounded-lg bg-[#0d1f2d] text-white font-bold text-sm
                          hover:bg-[#1e3448] transition-colors
                          shadow-[0_4px_14px_rgba(13,31,45,0.18)]">
              Join Pilot Program
            </a>
            <a href="#how-it-works"
               className="px-7 py-3.5 rounded-lg bg-[#0d1f2d] text-white font-semibold text-sm
                          hover:bg-[#1e3448] transition-colors">
              See How It Works
            </a>
          </div>

          {/* Trust line */}
          <p className="text-xs text-slate-500 mb-10 flex items-center gap-2">
            <span>30-day free pilot</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
            <span>No credit card</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
            <span>Cancel anytime</span>
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-3 border border-slate-200 rounded-xl overflow-hidden bg-white
                          shadow-sm">
            {stats.map((s, i) => (
              <div key={s.label}
                   className={`px-5 py-5 text-center
                     ${i < stats.length - 1 ? 'border-r border-slate-200' : ''}`}>
                <div className="text-[48px] font-bold text-[#0d1f2d] leading-none mb-1"
                     style={{ fontFamily: 'var(--font-geist-mono)' }}>
                  {s.value}
                </div>
                <div className="text-xs text-slate-500 font-medium leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT — product image ── */}
        <div className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-none">
            <Image
              src="/agentgst-hero.png"
              alt="AgentGST — AI-Powered GST Reconciliation Dashboard"
              width={1080}
              height={740}
              priority
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

      </div>
    </section>
  )
}
