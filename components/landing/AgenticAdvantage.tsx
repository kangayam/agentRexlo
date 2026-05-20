'use client'
import { useEffect, useRef, useState } from 'react'

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

const PAUSE_MS  = 4000   // hold all cards visible for 4s
const SCROLL_MS = 16000  // slowly scroll through in 16s
const CYCLE_MS  = PAUSE_MS + SCROLL_MS + PAUSE_MS

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function Card({ p, i }: { p: typeof points[0]; i: number }) {
  return (
    <div className="flex gap-4 items-start bg-white rounded-xl p-4
                    border border-[#e2e8f0] shadow-sm">
      <div className="w-9 h-9 rounded-lg bg-[#f0fdf4] border border-[#dcfce7]
                      flex items-center justify-center text-base flex-shrink-0">
        {p.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-slate-900 mb-0.5">{p.title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{p.body}</p>
      </div>
      <span className="text-[10px] font-bold text-slate-300 tracking-widest flex-shrink-0 mt-0.5">
        0{i + 1}
      </span>
    </div>
  )
}

export function AgenticAdvantage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef     = useRef<HTMLDivElement>(null)
  const rafRef       = useRef<number>(0)
  const startRef     = useRef<number | null>(null)
  const [isPaused, setIsPaused]     = useState(true)
  const [containerH, setContainerH] = useState(460)

  useEffect(() => {
    const track     = trackRef.current
    const container = containerRef.current
    if (!track || !container) return

    // Measure one full set of cards and set container height to fit all
    const oneSetHeight = track.scrollHeight / 2
    setContainerH(oneSetHeight)

    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts
      const elapsed = (ts - startRef.current) % CYCLE_MS

      let progress = 0
      let paused   = false

      if (elapsed < PAUSE_MS) {
        progress = 0
        paused   = true
      } else if (elapsed < PAUSE_MS + SCROLL_MS) {
        progress = easeInOut((elapsed - PAUSE_MS) / SCROLL_MS)
        paused   = false
      } else {
        progress = 1
        paused   = true
      }

      setIsPaused(paused)

      const half = track.scrollHeight / 2
      track.style.transform = `translateY(-${progress * half}px)`
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <section className="py-24 px-6 overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — heading */}
          <div className="lg:sticky lg:top-24">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#4eb564] mb-4">
              Why Rexlo Is Different
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-5 leading-tight">
              Your CAs Stopped Being Data Entry Operators.{' '}
              <span className="bg-gradient-to-r from-[#4eb564] via-[#62cac3] to-[#00FE89]
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
          <div
            ref={containerRef}
            className="relative overflow-hidden transition-all duration-300"
            style={{ height: containerH }}
          >
            {/* Fades — hidden during pause so all cards are fully visible */}
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-10
                         bg-gradient-to-b from-[#f8fafc] to-transparent transition-opacity duration-500"
              style={{ opacity: isPaused ? 0 : 1 }}
            />
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 z-10
                         bg-gradient-to-t from-[#f8fafc] to-transparent transition-opacity duration-500"
              style={{ opacity: isPaused ? 0 : 1 }}
            />

            {/* Track — duplicated for seamless loop */}
            <div ref={trackRef} className="flex flex-col gap-3 will-change-transform">
              {points.map(p => <Card key={`a-${p.title}`} p={p} i={points.indexOf(p)} />)}
              {points.map(p => <Card key={`b-${p.title}`} p={p} i={points.indexOf(p)} />)}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
