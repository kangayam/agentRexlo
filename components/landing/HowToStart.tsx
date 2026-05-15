import { useFadeIn } from '@/hooks/useFadeIn'

const steps = [
  {
    number: '01',
    numberColor: 'bg-[#00bfad]',
    title: 'Pilot at No Risk',
    body: 'Onboard 5 clients free for 30 days. We handle setup, data migration, and staff training. You just show up for the first reconciliation review.',
  },
  {
    number: '02',
    numberColor: 'bg-[#6366f1]',
    title: 'See Your Exact ROI',
    body: 'A 45-minute call. We model your specific practice ROI — your actual client mix, GSTIN count, and current billing rates. No generic slides.',
  },
  {
    number: '03',
    numberColor: 'bg-[#f59e0b]',
    title: 'Scale When Ready',
    body: "No lock-in contracts in Year 1. Expand at your pace. Revenue share available for partners who refer other CA firms.",
  },
]

export function HowToStart() {
  const ref = useFadeIn()

  return (
    <section className="bg-[#0f1629] py-24 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">

        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#00bfad] mb-4">
            Next Steps
          </p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
            Let&apos;s Build Your Advisory Practice Together.
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto">
            Start with 5 clients. 30 days. No commitment. See the intelligence layer
            in action with your actual data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(step => (
            <div key={step.number}
                 className="rounded-xl bg-white/5 border border-white/10 p-7
                            hover:bg-white/[0.08] transition-colors">
              <div className={`w-10 h-10 rounded-full ${step.numberColor} flex items-center
                              justify-center text-white font-extrabold text-sm mb-5`}>
                {step.number}
              </div>
              <h3 className="text-base font-bold text-white mb-3">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
