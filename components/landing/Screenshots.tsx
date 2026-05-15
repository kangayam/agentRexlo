'use client'

import { useFadeIn } from '@/hooks/useFadeIn'
import { Play } from 'lucide-react'

interface ScreenshotProps {
  slug: string
  label: string
}

function BrowserMockup({ slug, label }: ScreenshotProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50 w-full">
      {/* Browser chrome */}
      <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-yellow-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <div className="flex-1 ml-3 h-5 bg-white rounded border border-slate-200" />
      </div>
      {/* Screenshot area */}
      <img src={`/${slug}.png`} alt={label} className="w-full" />
    </div>
  )
}

function FeaturePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100
                     text-slate-600 text-xs font-semibold border border-slate-200">
      {label}
    </span>
  )
}

const rows = [
  {
    screenshotLeft: true,
    screenshot: { slug: 'ca-dashboard', label: 'CA Client Overview Dashboard' },
    labelColor: 'text-[#00bfad]',
    labelText: 'FOR CA FIRMS',
    heading: 'Your Entire Client Portfolio, Intelligently Monitored',
    body: 'See ITC cleared, ITC at risk, quality scores, and urgent actions across all your clients — in one view. No more chasing Excel sheets or calling clients to check status.',
    pills: ['ITC Leakage Alerts', 'Quality Scores', 'Urgent Actions'],
  },
  {
    screenshotLeft: false,
    screenshot: { slug: 'itc-leakage', label: 'ITC Leakage Breakdown' },
    labelColor: 'text-[#f59e0b]',
    labelText: 'ITC RECOVERY',
    heading: 'Know Exactly Where Every Rupee Is Leaking',
    body: 'AI breaks down ITC leakage by root cause — value mismatches, non-filing suppliers, invoices missing from books — with recoverable amounts flagged and prioritized by rupee impact.',
    pills: ['Root Cause Analysis', 'Recoverable ITC', 'Supplier Risk'],
  },
  {
    screenshotLeft: true,
    screenshot: { slug: 'portfolio-analytics', label: 'Portfolio Analytics' },
    labelColor: 'text-[#6366f1]',
    labelText: 'FIRM ANALYTICS',
    heading: 'Firm-Wide Intelligence for QBR Conversations',
    body: 'Track ITC recovery trends, quality scores, and at-risk amounts across your entire client portfolio. Built-in charts for your quarterly business review conversations — no manual prep required.',
    pills: ['ITC Trend Charts', 'Quality Score Trends', 'Export PDF'],
  },
  {
    screenshotLeft: false,
    screenshot: { slug: 'client-portal', label: 'Client GST Dashboard' },
    labelColor: 'text-[#00bfad]',
    labelText: 'CLIENT PORTAL',
    heading: 'Your Clients Get a Branded Portal Under YOUR Name',
    body: "The action queue tells your clients exactly what to do on GSTN — step by step instructions, sorted by rupee impact. You look like the expert. They stay compliant. Zero manual effort.",
    pills: ['White-Label Branding', 'Action Queue', '24/7 Access'],
  },
]

export function Screenshots() {
  const ref = useFadeIn()

  return (
    <section className="bg-[#f8fafc] py-24 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#00bfad] mb-4">
            See It In Action
          </p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0f172a] mb-4">
            Real Intelligence. Not Just Dashboards.
          </h2>
          <p className="text-base text-[#64748b] max-w-xl mx-auto">
            Here&apos;s what you and your clients actually see.
          </p>
        </div>

        {/* Feature rows */}
        <div className="space-y-24">
          {rows.map(row => (
            <div
              key={row.screenshot.slug}
              className={`flex flex-col ${row.screenshotLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}
            >
              {/* Screenshot */}
              <div className="w-full lg:w-1/2 flex-shrink-0">
                <BrowserMockup slug={row.screenshot.slug} label={row.screenshot.label} />
              </div>

              {/* Text */}
              <div className="w-full lg:w-1/2">
                <p className={`text-xs font-bold tracking-[0.15em] uppercase mb-3 ${row.labelColor}`}>
                  {row.labelText}
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] mb-4 leading-tight">
                  {row.heading}
                </h3>
                <p className="text-base text-[#64748b] mb-6 leading-relaxed">
                  {row.body}
                </p>
                <div className="flex flex-wrap gap-2">
                  {row.pills.map(p => <FeaturePill key={p} label={p} />)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Video placeholder */}
        <div className="mt-24 bg-[#0f1629] rounded-2xl max-w-3xl mx-auto px-8 py-16
                        flex flex-col items-center text-center border border-white/10">
          <div className="w-16 h-16 rounded-full bg-[#00bfad] flex items-center justify-center mb-5
                          shadow-lg shadow-teal-900/40">
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
          <div className="inline-flex px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30
                          text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">
            Video
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Watch a 2-Minute Product Walkthrough</h3>
          <p className="text-sm text-slate-400">
            Coming soon — see the full CA workflow in action
          </p>
        </div>

      </div>
    </section>
  )
}
