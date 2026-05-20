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

export function AgenticAdvantage() {
  return (
    <section className="py-24 px-6" style={{ backgroundColor: '#f8f8f8' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

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

          {/* Right — points list */}
          <div className="flex flex-col gap-6">
            {points.map((p, i) => (
              <div key={p.title}
                   className="flex gap-5 items-start bg-white rounded-2xl p-6
                              border border-slate-200 shadow-sm">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100
                                flex items-center justify-center text-lg flex-shrink-0">
                  {p.icon}
                </div>
                {/* Text */}
                <div>
                  <h3 className="text-sm font-black text-slate-900 mb-1">{p.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{p.body}</p>
                </div>
                {/* Number */}
                <span className="text-[10px] font-bold text-slate-300 tracking-widest ml-auto
                                 flex-shrink-0 mt-1">
                  0{i + 1}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
