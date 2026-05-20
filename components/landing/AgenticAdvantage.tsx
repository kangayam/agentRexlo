'use client'
import { useEffect, useRef } from 'react'

const points = [
  {
    title: 'Always On',
    body: 'AI agents run reconciliations overnight, across all clients. You arrive to a prioritised action list — not raw data.',
    icon: '🕐',
  },
  {
    title: 'Proactive, Not Reactive',
    body: 'Catches ITC leakage and vendor non-compliance before the government does. You call the client before the notice arrives.',
    icon: '🛡️',
  },
  {
    title: 'Scales Without Hiring',
    body: 'Your senior staff make judgment calls. Juniors stop cleaning data. One team handles 3× the clients.',
    icon: '📈',
  },
  {
    title: 'Regulation-Aware',
    body: 'IMS rules, GSTR-2B cutoffs, pre-14th deadlines — the agents know the calendar so your team doesn\'t have to.',
    icon: '📅',
  },
  {
    title: 'Full Audit Trail',
    body: 'Every accept, reject, and defer is logged with a reason. One-click audit-ready documentation for any client.',
    icon: '✅',
  },
]

const PAUSE_MS  = 3000   // hold still for 3s
const SCROLL_MS = 16000  // slowly scroll through in 16s
const CYCLE_MS  = PAUSE_MS + SCROLL_MS + PAUSE_MS

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function Card({ p, i }: { p: typeof points[0]; i: number }) {
  return (
    <div className="flex gap-5 items-start bg-white rounded-2xl p-6
                    border border-slate-200 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100
                      flex items-center justify-center text-lg flex-shrink-0">
        {p.icon}
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900 mb-1">{p.title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{p.body}</p>
      </div>
      <span className="text-[10px] font-bold text-slate-300 tracking-widest ml-auto flex-shrink-0 mt-1">
        0{i + 1}
      </span>
    </div>
  )
}

export function AgenticAdvantage() {
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef   = useRef<number>(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts
      const elapsed = (ts - startRef.current) % CYCLE_MS

      let progress = 0
      if (elapsed < PAUSE_MS) {
        // Phase 1: hold still — all cards visible
        progress = 0
      } else if (elapsed < PAUSE_MS + SCROLL_MS) {
        // Phase 2: smooth scroll
        progress = easeInOut((elapsed - PAUSE_MS) / SCROLL_MS)
      } else {
        // Phase 3: hold at end
        progress = 1
      }

      const halfHeight = track.scrollHeight / 2
      track.style.transform = `translateY(-${progress * halfHeight}px)`
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <section className="py-24 px-6 overflow-hidden" style={{ backgroundColor: '#f8f8f8' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — heading */}
          <div className="lg:sticky lg:top-24">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-indigo-600 mb-4">
              Why Rexlo Is Different
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-5 leading-tight">
              Your CAs Stopped Being Data Entry Operators.{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500
                               bg-clip-text text-transparent">
                Tonight.
              </span>
            </h2>
            <p className="text-base text-slate-500 leading-relaxed">
              Most GST tools automate the filing. Rexlo automates the thinking — surfacing
              risks, decisions, and client opportunities before you even open a spreadsheet.
            </p>
          </div>

          {/* Right — cinematic pause-scroll-pause */}
          <div className="relative h-[460px] overflow-hidden">

            {/* Top fade */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-20 z-10
                            bg-gradient-to-b from-[#f8f8f8] to-transparent" />
            {/* Bottom fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 z-10
                            bg-gradient-to-t from-[#f8f8f8] to-transparent" />

            {/* Track — duplicated for seamless loop */}
            <div ref={trackRef} className="flex flex-col gap-5 will-change-transform">
              {points.map(p => <Card key={`a-${p.title}`} p={p} i={points.indexOf(p)} />)}
              {points.map(p => <Card key={`b-${p.title}`} p={p} i={points.indexOf(p)} />)}
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
