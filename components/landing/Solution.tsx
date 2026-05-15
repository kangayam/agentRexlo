'use client'

import { useFadeIn } from '@/hooks/useFadeIn'
import { Cpu, Eye, ShieldCheck, RefreshCw, BarChart2, Building2 } from 'lucide-react'

const cards = [
  {
    border: 'border-t-[#00bfad]',
    icon: <Cpu className="w-6 h-6 text-[#00bfad]" />,
    title: 'Bandwidth Liberation',
    body: 'AI runs GSTR-1 vs 2B vs books continuously. You review exceptions — not raw data.',
  },
  {
    border: 'border-t-[#6366f1]',
    icon: <Eye className="w-6 h-6 text-[#6366f1]" />,
    title: 'Advisory Intelligence',
    body: 'ITC opportunity scores, vendor risk flags, refund pipeline — insights your clients have never received before.',
  },
  {
    border: 'border-t-[#00bfad]',
    icon: <ShieldCheck className="w-6 h-6 text-[#00bfad]" />,
    title: 'Pre-Filing Protection',
    body: 'Catch discrepancies before the government sees them. Call the client before the notice arrives.',
  },
  {
    border: 'border-t-[#f59e0b]',
    icon: <RefreshCw className="w-6 h-6 text-[#f59e0b]" />,
    title: 'IMS Workflow Engine',
    body: 'Accept / reject / defer decisions automated across all clients. Complete audit trail included.',
  },
  {
    border: 'border-t-[#6366f1]',
    icon: <BarChart2 className="w-6 h-6 text-[#6366f1]" />,
    title: 'Branded QBR Reports',
    body: "Quarterly business reviews auto-generated under your firm's name. AI analyses, you advise.",
  },
  {
    border: 'border-t-[#00bfad]',
    icon: <Building2 className="w-6 h-6 text-[#00bfad]" />,
    title: 'White-Label Client Portal',
    body: "Clients log in under YOUR brand. Their GST health dashboard, your firm's name. Deepens retention, commands premium fees.",
  },
]

export function Solution() {
  const ref = useFadeIn()

  return (
    <section id="how-it-works" className="bg-[#0f1629] py-24 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">

        {/* Label */}
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#00bfad] mb-4">
          The Solution
        </p>

        <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4 max-w-3xl">
          AI Powered Intelligent Agents
        </h2>
        <p className="text-base text-slate-400 mb-14 max-w-2xl">
          Not a reconciliation tool. A system that turns compliance data into advisory
          intelligence — and a repeatable way to charge for it.
        </p>

        {/* 6-card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map(card => (
            <div key={card.title}
                 className={`rounded-xl bg-white/5 border-t-2 ${card.border} p-6
                             hover:bg-white/[0.08] transition-colors`}>
              <div className="mb-4">{card.icon}</div>
              <h3 className="text-base font-bold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
