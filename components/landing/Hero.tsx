'use client'

export function Hero() {
  return (
    <section className="relative min-h-screen bg-white flex flex-col justify-center pt-16 overflow-hidden">

      {/* Gradient blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full
                      bg-[radial-gradient(circle,rgba(139,92,246,0.18)_0%,rgba(99,102,241,0.08)_40%,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 -left-16 w-[360px] h-[360px] rounded-full
                      bg-[radial-gradient(circle,rgba(236,72,153,0.10)_0%,transparent_70%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-0 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200
                        rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-indigo-600 tracking-wide">
          ✦ Powered by Agentic AI
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900
                       leading-[1.1] tracking-tight mb-6">
          Turn GST Compliance Into Your{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500
                           bg-clip-text text-transparent">
            Biggest Revenue Driver
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI agents handle IMS reconciliation, ITC recovery, and client reports — so your firm
          earns more from every client without working more hours.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
          <a href="#cta"
             className="px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm
                        hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
            Request a Demo →
          </a>
          <a href="#screenshots"
             className="px-8 py-3.5 rounded-xl border border-indigo-200 text-indigo-600
                        font-semibold text-sm hover:bg-indigo-50 transition-colors bg-white">
            ▶ Watch 2-min overview
          </a>
        </div>

        {/* Dashboard peek */}
        <div className="mx-4 sm:mx-8 rounded-t-2xl overflow-hidden border border-slate-200
                        border-b-0 shadow-[0_-8px_40px_rgba(99,102,241,0.15)]">
          {/* Browser chrome bar */}
          <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-600" />
            <span className="w-3 h-3 rounded-full bg-slate-600" />
            <span className="w-3 h-3 rounded-full bg-slate-600" />
            <span className="ml-4 text-[10px] text-slate-500">app.rexlo.in/ca/dashboard</span>
          </div>
          {/* Stat cards row */}
          <div className="bg-slate-900 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { val: '₹2,20,443',  lbl: 'ITC Cleared',    color: 'text-emerald-400' },
              { val: '₹13,72,253', lbl: 'ITC Leakage',    color: 'text-red-400'     },
              { val: '41 / 100',   lbl: 'Quality Score',  color: 'text-blue-400'    },
              { val: '2',          lbl: 'Active Clients',  color: 'text-amber-400'   },
            ].map(s => (
              <div key={s.lbl} className="bg-slate-800 rounded-lg px-4 py-3">
                <div className={`text-sm font-bold ${s.color} mb-0.5`}>{s.val}</div>
                <div className="text-[11px] text-slate-500">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
