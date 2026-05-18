interface Tier {
  name: string
  price: string
  period: string
  description: string
  featured: boolean
}

const tiers: Tier[] = [
  {
    name: 'GROWTH',
    price: '₹60K – ₹1.2L',
    period: 'per year · ₹10–50 Cr turnover',
    description: 'Up to 10 GSTINs. Full reconciliation engine. CA dashboard.',
    featured: false,
  },
  {
    name: 'SCALE',
    price: '₹2L – ₹5L',
    period: 'per year · ₹50–200 Cr turnover',
    description: 'Up to 50 GSTINs. White-label portal. Advisory dashboards. Priority support.',
    featured: true,
  },
  {
    name: 'ENTERPRISE',
    price: 'Custom',
    period: '₹200 Cr+ turnover',
    description: 'Unlimited GSTINs. ERP integrations. Dedicated success manager.',
    featured: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Simple, value-based pricing
          </h2>
          <p className="text-base text-slate-500">
            Start free for 30 days. No credit card.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map(tier => (
            <div key={tier.name}
                 className={`rounded-2xl p-8 border ${
                   tier.featured
                     ? 'border-indigo-400 bg-indigo-50 relative'
                     : 'border-slate-200 bg-white'
                 }`}>
              {tier.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-indigo-600 text-white
                                   text-[10px] font-bold tracking-wide">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <p className={`text-[10px] font-bold tracking-[0.15em] uppercase mb-4 ${
                tier.featured ? 'text-indigo-600' : 'text-slate-400'
              }`}>
                {tier.name}
              </p>
              <p className="text-2xl font-black text-slate-900 mb-1">{tier.price}</p>
              <p className="text-xs text-slate-500 mb-6">{tier.period}</p>
              <p className="text-sm text-slate-600 leading-relaxed mb-8">{tier.description}</p>
              <a href="#cta"
                 className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition-colors ${
                   tier.featured
                     ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                     : 'border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                 }`}>
                Get Started
              </a>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
