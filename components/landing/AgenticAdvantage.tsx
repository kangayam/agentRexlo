'use client'

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

function Card({ p, i }: { p: typeof points[0]; i: number }) {
  return (
    <div className="flex gap-5 items-start bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
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
  return (
    <section className="py-24 px-6 overflow-hidden" style={{ backgroundColor: '#f8f8f8' }}>

      {/* Keyframe injection */}
      <style>{`
        @keyframes scrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .scroll-track {
          animation: scrollUp 18s linear infinite;
        }
        .scroll-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — sticky heading */}
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

          {/* Right — cinematic scroll */}
          <div className="relative h-[420px] overflow-hidden">

            {/* Top fade */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-10
                            bg-gradient-to-b from-[#f8f8f8] to-transparent" />

            {/* Bottom fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 z-10
                            bg-gradient-to-t from-[#f8f8f8] to-transparent" />

            {/* Scrolling track — duplicated for seamless loop */}
            <div className="scroll-track flex flex-col gap-5">
              {/* First set */}
              {points.map((p, i) => (
                <Card key={`a-${p.title}`} p={p} i={i} />
              ))}
              {/* Duplicate for seamless loop */}
              {points.map((p, i) => (
                <Card key={`b-${p.title}`} p={p} i={i} />
              ))}
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
