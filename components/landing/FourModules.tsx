const modules = [
  {
    number: '01',
    title: 'Unified Data Intelligence',
    body: 'Pulls IMS (GSTN), Tally, and vendor data into one place. No more switching between portals and Excel. Every client\'s books, always in sync.',
    icon: '🔗',
  },
  {
    number: '02',
    title: 'Continuous Reconciliation',
    body: 'Automatically matches IMS invoices against Tally purchase records for every client, every month. Flags mismatches. Auto-accepts the clean ones.',
    icon: '⚡',
  },
  {
    number: '03',
    title: 'ITC & Cashflow Optimisation',
    body: 'Spots blocked ITC before the 14th deadline. Ranks recovery opportunities by rupee value. Tells you exactly which supplier to chase first.',
    icon: '₹',
  },
  {
    number: '04',
    title: 'Client-Ready Insights',
    body: 'Auto-generates advisory reports under your firm\'s name. Your clients see their GST health — you look like the expert who built it.',
    icon: '📊',
  },
]

export function FourModules() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#4eb564] mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Four AI Agents. One Platform. Zero Spreadsheets.
          </h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto">
            Each agent handles a specific part of your monthly GST workflow — so you and your
            team focus only on judgment calls, not data entry.
          </p>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map(m => (
            <div key={m.number}
                 className="group relative bg-[#F9FAFB] hover:bg-white border border-slate-200
                            hover:border-[#bbf7d0] rounded-2xl p-8 transition-all duration-200">

              {/* Number + icon */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-[11px] font-bold text-slate-400 tracking-widest">
                  {m.number}
                </span>
                <span className="text-2xl">{m.icon}</span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-black text-slate-900 mb-3 group-hover:text-indigo-900
                             transition-colors">
                {m.title}
              </h3>

              {/* Body */}
              <p className="text-sm text-slate-600 leading-relaxed">
                {m.body}
              </p>

              {/* Hover accent line */}
              <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-[#4eb564] rounded-full
                              scale-x-0 group-hover:scale-x-100 transition-transform duration-200
                              origin-left" />
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
