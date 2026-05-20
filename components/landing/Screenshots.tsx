'use client'
import { Play } from 'lucide-react'

interface Row {
  screenshotLeft: boolean
  screenshot: { slug: string; label: string }
  tag: string
  tagColor: string
  heading: string
  body: string
  pills: string[]
}

const rows: Row[] = [
  {
    screenshotLeft: false,
    screenshot: { slug: 'ca-dashboard', label: 'CA Client Overview Dashboard' },
    tag: 'FOR CA FIRMS',
    tagColor: 'text-[#4eb564]',
    heading: 'Your Entire Client Portfolio, Intelligently Monitored',
    body: 'See ITC cleared, ITC at risk, quality scores, and urgent actions across all your clients — in one view. No more chasing Excel sheets or calling clients to check status.',
    pills: ['ITC Leakage Alerts', 'Quality Scores', 'Urgent Actions'],
  },
  {
    screenshotLeft: true,
    screenshot: { slug: 'client-portal', label: 'Client Action Queue' },
    tag: 'ACTION QUEUE',
    tagColor: 'text-[#4eb564]',
    heading: 'Plain-English Instructions for Every Invoice',
    body: 'Clients see exactly what to do on the GSTN portal — no jargon, no confusion. Accept, reject, or defer. Mark done. ITC protected.',
    pills: ['ITC Trend Charts', 'Quality Score Trends', 'Export PDF'],
  },
  {
    screenshotLeft: false,
    screenshot: { slug: 'itc-leakage', label: 'ITC Leakage Analytics' },
    tag: 'ITC RECOVERY',
    tagColor: 'text-[#4eb564]',
    heading: 'Know Exactly Where Every Rupee Is Leaking',
    body: 'AI breaks down ITC leakage by root cause — value mismatches, non-filing suppliers, invoices missing from books — with recoverable amounts flagged and prioritized by rupee impact.',
    pills: ['Root Cause Analysis', 'Recoverable ITC', 'Supplier Risk'],
  },
]

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                     bg-[#f0fdf4] border border-[#bbf7d0] text-[#4eb564]
                     text-xs font-semibold">
      ✓ {label}
    </span>
  )
}

function ScreenshotCard({ slug, label }: { slug: string; label: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#e2e8f0] shadow-lg shadow-slate-200/60 w-full">
      <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="flex-1 ml-2 h-4 bg-white rounded border border-slate-200" />
      </div>
      <img src={`/${slug}.png`} alt={label} className="w-full block" />
    </div>
  )
}

export function Screenshots() {
  return (
    <section id="screenshots" className="bg-[#f8fafc] py-24 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#4eb564] mb-4">
            See It In Action
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">
            Real Intelligence. Not Just Dashboards.
          </h2>
          <p className="text-base text-slate-500 max-w-xl mx-auto">
            Here&apos;s what you and your clients actually see.
          </p>
        </div>

        {/* Rows */}
        <div className="space-y-24">
          {rows.map(row => (
            <div
              key={row.screenshot.slug}
              className={`flex flex-col ${row.screenshotLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}
            >
              <div className="w-full lg:w-1/2 flex-shrink-0">
                <ScreenshotCard slug={row.screenshot.slug} label={row.screenshot.label} />
              </div>
              <div className="w-full lg:w-1/2">
                <p className={`text-[10px] font-bold tracking-[0.15em] uppercase mb-3 ${row.tagColor}`}>
                  {row.tag}
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4 leading-tight">
                  {row.heading}
                </h3>
                <p className="text-base text-slate-500 mb-6 leading-relaxed">
                  {row.body}
                </p>
                <div className="flex flex-wrap gap-2">
                  {row.pills.map(p => <Pill key={p} label={p} />)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Video */}
        <div className="mt-24 bg-white rounded-2xl max-w-3xl mx-auto px-8 py-16
                        flex flex-col items-center text-center border border-slate-200
                        shadow-sm relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full
                          bg-[radial-gradient(circle,rgba(99,102,241,0.10)_0%,transparent_70%)]" />
          <div className="w-14 h-14 rounded-full bg-[#4eb564] flex items-center justify-center mb-5
                          shadow-lg shadow-[#bbf7d0] relative z-10">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2 relative z-10">
            See Rexlo in action — 2 minutes
          </h3>
          <p className="text-sm text-slate-500 relative z-10">
            From file upload to action queue. Watch a full reconciliation cycle.
          </p>
        </div>

      </div>
    </section>
  )
}
