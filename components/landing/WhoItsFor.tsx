export function WhoItsFor() {
  return (
    <section id="who-its-for" className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Built for the whole GST ecosystem
          </h2>
          <p className="text-base text-slate-500">
            Whether you&apos;re a CA managing clients or a business protecting cash flow.
          </p>
        </div>

        {/* Two cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CA Card */}
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-8">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-violet-600 mb-4">
              FOR CHARTERED ACCOUNTANTS
            </p>
            <h3 className="text-xl font-black text-slate-900 mb-3 leading-snug">
              Scale your advisory practice 3× with AI
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Stop spending 65 hours a month on manual reconciliation. Let AI handle the data —
              you handle the advice.
            </p>
            <ul className="space-y-2 mb-8">
              {[
                'Auto-reconcile IMS vs Tally for all clients',
                'White-label client portal under your brand',
                '3× client capacity with same team',
                'Revenue: ₹8K/client → ₹17K/client',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-violet-600 font-bold mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#cta"
               className="text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors">
              Join CA Pilot Program →
            </a>
          </div>

          {/* Business Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-emerald-600 mb-4">
              FOR BUSINESSES &amp; CFOS
            </p>
            <h3 className="text-xl font-black text-slate-900 mb-3 leading-snug">
              Stop losing 2–5% of eligible ITC every quarter
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Permanent cash loss from ITC leakage compounds every month. AI agents find it
              and recover it — before the deadline.
            </p>
            <ul className="space-y-2 mb-8">
              {[
                '99% reconciliation accuracy',
                'Pre-filing protection — catch errors first',
                '60% fewer government notices',
                'Working capital freed in weeks, not months',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#cta"
               className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
              See Business ROI Calculator →
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}
