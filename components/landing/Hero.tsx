'use client'

export function Hero() {
  return (
    <section className="relative min-h-screen bg-white flex items-center pt-16 overflow-hidden">

      {/* Gradient blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full
                      bg-[radial-gradient(circle,rgba(139,92,246,0.18)_0%,rgba(99,102,241,0.08)_40%,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 -left-16 w-[360px] h-[360px] rounded-full
                      bg-[radial-gradient(circle,rgba(236,72,153,0.10)_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT: Text + CTAs ── */}
          <div className="flex flex-col">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200
                            rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-indigo-600
                            tracking-wide self-start">
              ✦ Powered by Agentic AI
            </div>

            {/* Headline */}
            <h1 className="font-geist font-bold text-[3.75rem] text-[#0f172a]
                           leading-[1.1] tracking-[-0.04em] mb-6">
              Turn GST Compliance Into Your{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500
                               bg-clip-text text-transparent">
                Biggest Revenue Driver
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-[20px] font-medium text-[#64748b] max-w-xl mb-10 leading-relaxed">
              AI agents handle IMS reconciliation, ITC recovery, and client reports — so your
              firm earns more from every client without working more hours.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#cta"
                 className="px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm
                            hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200
                            text-center">
                Request a Demo →
              </a>
              <a href="#screenshots"
                 className="px-8 py-3.5 rounded-xl border border-indigo-200 text-indigo-600
                            font-semibold text-sm hover:bg-indigo-50 transition-colors bg-white
                            text-center">
                ▶ Watch 2-min overview
              </a>
            </div>

          </div>

          {/* ── RIGHT: Video ── */}
          <div className="relative flex items-center justify-center">
            {/* Subtle glow behind video */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl
                            bg-[radial-gradient(circle,rgba(99,102,241,0.10)_0%,transparent_70%)]" />

            <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200
                            shadow-2xl shadow-indigo-100">
              <video
                src="/Four AI-Powered Modules.mp4"
                autoPlay
                muted
                playsInline
                className="w-full h-auto block"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
