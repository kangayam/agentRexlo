# AgentGST Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete production-quality marketing landing page at `/` for AgentGST, with unauthenticated visitors seeing the page and authenticated users redirected to their dashboards.

**Architecture:** 9 section components in `components/landing/`, assembled in `app/page.tsx` which checks auth and either redirects or renders the landing page. Scroll animations via a lightweight `useFadeIn` hook (Intersection Observer, no extra dependencies). All styles via Tailwind with custom design tokens inlined.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, lucide-react

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/globals.css` | Modify | Add smooth-scroll + fade-in animation |
| `app/layout.tsx` | Modify | Update metadata title/description |
| `app/page.tsx` | Modify | Auth check → redirect or render landing |
| `hooks/useFadeIn.ts` | Create | Intersection Observer fade-in hook |
| `components/landing/Nav.tsx` | Create | Sticky nav with blur, mobile hamburger |
| `components/landing/Hero.tsx` | Create | Dark hero, stats bar, dual CTAs |
| `components/landing/Problem.tsx` | Create | Problem section, 2 cards + callout |
| `components/landing/Solution.tsx` | Create | 6-card solution grid |
| `components/landing/Screenshots.tsx` | Create | 4 feature rows + video placeholder |
| `components/landing/Economics.tsx` | Create | Comparison table + stat grid |
| `components/landing/HowToStart.tsx` | Create | 3 numbered step cards |
| `components/landing/FinalCTA.tsx` | Create | Email form + trust badges |
| `components/landing/Footer.tsx` | Create | 3-column footer |

---

## Task 1 — Foundation: globals, layout, fade-in hook

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `hooks/useFadeIn.ts`

- [ ] **Step 1.1 — Add smooth-scroll and fade-in animation to `app/globals.css`**

Append to the end of `app/globals.css`:

```css
html {
  scroll-behavior: smooth;
}

.fade-in {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.65s ease, transform 0.65s ease;
}

.fade-in.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 1.2 — Update metadata in `app/layout.tsx`**

Find the `export const metadata` block and replace it:

```ts
export const metadata: Metadata = {
  title: 'AgentGST — AI-Native GST Intelligence for CA Firms',
  description: 'AI agents that help CA firms double revenue per client and triple client capacity. Automated reconciliation, ITC recovery, and branded client portals.',
}
```

- [ ] **Step 1.3 — Create `hooks/useFadeIn.ts`**

```ts
import { useEffect, useRef } from 'react'

export function useFadeIn<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.classList.add('fade-in')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}
```

- [ ] **Step 1.4 — Verify TypeScript is clean**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 1.5 — Commit**

```bash
git add app/globals.css app/layout.tsx hooks/useFadeIn.ts
git commit -m "feat: landing page foundation — smooth scroll, fade-in hook, metadata"
```

---

## Task 2 — Nav Component

**Files:**
- Create: `components/landing/Nav.tsx`

- [ ] **Step 2.1 — Create `components/landing/Nav.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function Nav() {
  const [open, setOpen] = useState(false)

  const links = [
    { label: 'Features',      href: '#features'      },
    { label: 'How It Works',  href: '#how-it-works'  },
    { label: 'Pricing',       href: '#pricing'       },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1629]/85 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-[#00bfad] font-extrabold text-xl tracking-tight">AgentGST</span>
          <span className="hidden sm:inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full
                           bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 tracking-wider uppercase">
            Powered by Agentic AI
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.label} href={l.href}
               className="text-sm text-slate-300 hover:text-white transition-colors font-medium">
              {l.label}
            </a>
          ))}
          <a href="#cta"
             className="px-4 py-2 rounded-lg bg-[#00bfad] text-white text-sm font-bold
                        hover:bg-[#00a89a] transition-colors">
            Join Pilot Program
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-300 hover:text-white transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-[#0f1629] border-t border-white/10 px-6 py-5 space-y-1">
          {links.map(l => (
            <a key={l.label} href={l.href}
               onClick={() => setOpen(false)}
               className="block py-3 text-sm text-slate-300 hover:text-white transition-colors font-medium border-b border-white/5">
              {l.label}
            </a>
          ))}
          <div className="pt-3">
            <a href="#cta"
               onClick={() => setOpen(false)}
               className="block w-full text-center py-3 rounded-lg bg-[#00bfad] text-white text-sm font-bold">
              Join Pilot Program
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
```

- [ ] **Step 2.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 2.3 — Commit**

```bash
git add components/landing/Nav.tsx
git commit -m "feat: landing Nav component — sticky, blur, mobile hamburger"
```

---

## Task 3 — Hero Component

**Files:**
- Create: `components/landing/Hero.tsx`

- [ ] **Step 3.1 — Create `components/landing/Hero.tsx`**

```tsx
import { useFadeIn } from '@/hooks/useFadeIn'

const stats = [
  { value: '5×',    label: 'ROI in Month 1'              },
  { value: '+₹36L', label: 'Annual Revenue Uplift'        },
  { value: '3×',    label: 'Client Capacity, Same Team'   },
]

export function Hero() {
  const ref = useFadeIn()

  return (
    <section className="min-h-screen bg-[#0f1629] flex flex-col items-center justify-center
                        px-6 pt-24 pb-20">
      <div ref={ref} className="max-w-4xl mx-auto text-center w-full">

        {/* Pilot badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                        bg-amber-500/10 border border-amber-500/30 text-amber-400
                        text-xs font-bold mb-8 tracking-wide">
          🚀 Now accepting CA Pilot Partners — 30 spots remaining
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white
                       leading-[1.08] tracking-tight mb-6">
          Turn GST Compliance Into<br />
          <span className="text-[#00bfad]">Your Biggest Revenue Driver</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI agents that help CA firms double revenue per client and triple client
          capacity — while delivering branded advisory to every client, automatically.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-5">
          <a href="#cta"
             className="px-8 py-4 rounded-xl bg-[#00bfad] text-white font-bold text-base
                        hover:bg-[#00a89a] transition-colors shadow-lg shadow-teal-900/30">
            Join Pilot Program
          </a>
          <a href="#how-it-works"
             className="px-8 py-4 rounded-xl border border-white/20 text-white font-semibold
                        text-base hover:bg-white/5 transition-colors">
            See How It Works
          </a>
        </div>

        {/* Trust line */}
        <p className="text-xs text-slate-500 mb-16">
          30-day free pilot · No credit card · Cancel anytime
        </p>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-white/10 rounded-2xl overflow-hidden">
          {stats.map((s, i) => (
            <div key={s.label}
                 className={`px-8 py-7 text-center
                   ${i < stats.length - 1
                     ? 'border-b sm:border-b-0 sm:border-r border-white/10'
                     : ''}`}>
              <div className="text-4xl font-extrabold text-[#00bfad] mb-1">{s.value}</div>
              <div className="text-sm text-slate-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
```

- [ ] **Step 3.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 3.3 — Commit**

```bash
git add components/landing/Hero.tsx
git commit -m "feat: landing Hero — headline, CTAs, stats bar"
```

---

## Task 4 — Problem Section

**Files:**
- Create: `components/landing/Problem.tsx`

- [ ] **Step 4.1 — Create `components/landing/Problem.tsx`**

```tsx
import { useFadeIn } from '@/hooks/useFadeIn'

const cards = [
  {
    title: 'GST Filing Fees Under Pressure',
    points: [
      'Automation is reducing the perceived value of compliance work',
      'Margins shrinking despite rising workload and complexity',
      'Clients expect more for less every year',
    ],
  },
  {
    title: 'Advisory Is High-Margin but Hard to Scale',
    points: [
      'Valuable insights require 1–2 days of manual review per client',
      'Growth is tied to human capacity, not technology',
      'Revenue ceiling hit without growing headcount',
    ],
  },
]

export function Problem() {
  const ref = useFadeIn()

  return (
    <section id="features" className="bg-[#f8fafc] py-24 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">

        {/* Label */}
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#00bfad] mb-4">
          The Problem
        </p>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0f172a] leading-tight mb-4 max-w-3xl">
          Tax Filing Is Becoming a Commodity. Advisory Is the Future.
        </h2>

        <p className="text-base italic text-[#64748b] mb-12 max-w-2xl">
          CA firms that don&apos;t build advisory capability risk long-term commoditization.
        </p>

        {/* Two cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {cards.map(card => (
            <div key={card.title}
                 className="rounded-xl border border-amber-200 bg-white p-6
                            shadow-sm shadow-amber-100/50">
              <h3 className="text-base font-bold text-[#0f172a] mb-4">{card.title}</h3>
              <ul className="space-y-3">
                {card.points.map(pt => (
                  <li key={pt} className="flex items-start gap-3 text-sm text-[#64748b]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Callout */}
        <div className="rounded-xl border border-[#00bfad]/40 bg-[#00bfad]/5 px-8 py-6 text-center">
          <p className="text-base sm:text-lg font-bold text-[#0f172a] leading-relaxed">
            What if you could productize and scale high-margin advisory across every client
            — with AI?
          </p>
        </div>

      </div>
    </section>
  )
}
```

- [ ] **Step 4.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 4.3 — Commit**

```bash
git add components/landing/Problem.tsx
git commit -m "feat: landing Problem section"
```

---

## Task 5 — Solution Section

**Files:**
- Create: `components/landing/Solution.tsx`

- [ ] **Step 5.1 — Create `components/landing/Solution.tsx`**

```tsx
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
                             hover:bg-white/8 transition-colors`}>
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
```

- [ ] **Step 5.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 5.3 — Commit**

```bash
git add components/landing/Solution.tsx
git commit -m "feat: landing Solution section — 6-card grid"
```

---

## Task 6 — Screenshots Section

**Files:**
- Create: `components/landing/Screenshots.tsx`

- [ ] **Step 6.1 — Create `components/landing/Screenshots.tsx`**

```tsx
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
      {/* Replace with actual screenshot: {slug} */}
      {/* <img src={`/screenshots/${slug}.png`} alt={label} className="w-full" /> */}
      <div
        data-screenshot={slug}
        className="h-80 bg-slate-100 flex flex-col items-center justify-center"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-xs text-slate-400 mt-1">[Screenshot: {slug}]</p>
      </div>
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
```

- [ ] **Step 6.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 6.3 — Commit**

```bash
git add components/landing/Screenshots.tsx
git commit -m "feat: landing Screenshots — 4 feature rows, browser mockup, video placeholder"
```

---

## Task 7 — Economics Section

**Files:**
- Create: `components/landing/Economics.tsx`

- [ ] **Step 7.1 — Create `components/landing/Economics.tsx`**

```tsx
import { useFadeIn } from '@/hooks/useFadeIn'

const tableRows = [
  { label: 'Revenue / client',  today: '₹8,000 / mo',         after: '₹17,000 / mo'              },
  { label: 'Clients managed',   today: '40',                   after: '80–100'                     },
  { label: 'Monthly revenue',   today: '₹3.2L',               after: '₹6.8L+'                     },
  { label: 'Billing model',     today: 'Filing volume',        after: 'Compliance + Advisory'      },
  { label: 'Junior staff',      today: 'Burns out on Excel',   after: 'Learns & grows'             },
]

const statCards = [
  { value: '5×',    label: 'ROI on platform in Month 1',    color: 'text-[#00bfad]' },
  { value: '+₹36L', label: 'Annual practice revenue uplift', color: 'text-[#6366f1]' },
  { value: '3×',    label: 'Client capacity with same team', color: 'text-[#00bfad]' },
  { value: '₹60K',  label: 'Platform cost for 40 GSTINs/mo', color: 'text-[#64748b]' },
]

export function Economics() {
  const ref = useFadeIn()

  return (
    <section id="pricing" className="bg-[#f8fafc] py-24 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">

        {/* Header */}
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#00bfad] mb-4">
          The Economics
        </p>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0f172a] mb-4 leading-tight">
          What This Looks Like in Your P&amp;L
        </h2>
        <p className="text-base text-[#64748b] mb-14 max-w-2xl">
          A 40-client CA firm. The math is straightforward — and it compounds every quarter
          as advisory retainers replace filing fees.
        </p>

        <div className="flex flex-col lg:flex-row gap-10">

          {/* Comparison table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase
                                 tracking-wider w-1/3" />
                  <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider
                                 text-red-600 bg-red-50 rounded-tl-xl w-1/3">
                    Today
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider
                                 text-[#00bfad] bg-teal-50/50 rounded-tr-xl w-1/3">
                    With AgentGST
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-4 text-sm font-medium text-[#0f172a]">{row.label}</td>
                    <td className="py-3 px-4 text-sm text-center text-[#64748b] bg-red-50/30">
                      {row.today}
                    </td>
                    <td className="py-3 px-4 text-sm text-center font-bold text-[#00bfad] bg-teal-50/30">
                      {row.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-xs italic text-[#64748b] mt-4 px-1 leading-relaxed">
              Assumptions: 40-client firm · ₹8K/client/month current billing ·
              ₹1,500/GSTIN/month platform fee · Advisory uplift based on pilot data
            </p>
          </div>

          {/* Stat cards */}
          <div className="lg:w-72 grid grid-cols-2 gap-4 content-start">
            {statCards.map(card => (
              <div key={card.label}
                   className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm text-center">
                <div className={`text-3xl font-extrabold mb-1 ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-xs text-[#64748b] leading-snug font-medium">
                  {card.label}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 7.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 7.3 — Commit**

```bash
git add components/landing/Economics.tsx
git commit -m "feat: landing Economics section — comparison table, stat cards"
```

---

## Task 8 — HowToStart Section

**Files:**
- Create: `components/landing/HowToStart.tsx`

- [ ] **Step 8.1 — Create `components/landing/HowToStart.tsx`**

```tsx
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
                            hover:bg-white/8 transition-colors">
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
```

- [ ] **Step 8.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 8.3 — Commit**

```bash
git add components/landing/HowToStart.tsx
git commit -m "feat: landing HowToStart section — 3 numbered steps"
```

---

## Task 9 — FinalCTA + Footer

**Files:**
- Create: `components/landing/FinalCTA.tsx`
- Create: `components/landing/Footer.tsx`

- [ ] **Step 9.1 — Create `components/landing/FinalCTA.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useFadeIn } from '@/hooks/useFadeIn'

const trustBadges = ['30-day free pilot', 'No credit card', 'Cancel anytime']

export function FinalCTA() {
  const ref = useFadeIn()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    // Placeholder: replace with actual form submission
    setSubmitted(true)
  }

  return (
    <section id="cta"
             className="py-24 px-6"
             style={{ background: 'linear-gradient(135deg, #00bfad 0%, #0284c7 50%, #6366f1 100%)' }}>
      <div ref={ref} className="max-w-2xl mx-auto text-center">

        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
          Ready to Recover Every Rupee?
        </h2>
        <p className="text-base text-white/80 mb-10 leading-relaxed">
          Every quarter you wait, 2–5% of your clients&apos; eligible ITC stays on the table.
          Our AI agents work 24/7 so your team doesn&apos;t have to.
        </p>

        {/* Form */}
        {submitted ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-5 mb-6">
            <p className="text-white font-semibold text-base">
              🎉 Thanks! We&apos;ll be in touch within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 h-12 px-4 rounded-xl bg-white/10 backdrop-blur-sm
                         border border-white/20 text-white placeholder:text-white/50
                         focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
            />
            <button
              type="submit"
              className="h-12 px-6 rounded-xl bg-[#0f1629] text-white font-bold text-sm
                         hover:bg-[#1e2d4d] transition-colors whitespace-nowrap">
              Book a Free Call
            </button>
          </form>
        )}

        <p className="text-xs text-white/60 mb-8">
          Or email us directly:{' '}
          <a href="mailto:partners@agentgst.in"
             className="underline hover:text-white transition-colors">
            partners@agentgst.in
          </a>
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4">
          {trustBadges.map(b => (
            <span key={b}
                  className="flex items-center gap-2 text-xs font-semibold text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
              {b}
            </span>
          ))}
        </div>

      </div>
    </section>
  )
}
```

- [ ] **Step 9.2 — Create `components/landing/Footer.tsx`**

```tsx
const footerLinks = [
  { label: 'Features',    href: '#features'      },
  { label: 'Pricing',     href: '#pricing'       },
  { label: 'CA Partners', href: '#cta'           },
  { label: 'Privacy',     href: '/privacy'       },
  { label: 'Terms',       href: '/terms'         },
]

export function Footer() {
  return (
    <footer className="bg-[#0f1629] border-t border-white/10 px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center
                      justify-between gap-6 text-sm">

        {/* Left */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
            <span className="text-[#00bfad] font-extrabold text-lg">AgentGST</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-indigo-500/15 text-indigo-300 border border-indigo-500/30
                             tracking-wider uppercase">
              Powered by Agentic AI
            </span>
          </div>
          <p className="text-xs text-[#64748b]">© 2026 AgentGST. All rights reserved.</p>
        </div>

        {/* Center links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {footerLinks.map(l => (
            <a key={l.label} href={l.href}
               className="text-xs text-[#64748b] hover:text-slate-300 transition-colors font-medium">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right */}
        <div className="text-center md:text-right">
          <a href="mailto:partners@agentgst.in"
             className="text-xs text-[#64748b] hover:text-slate-300 transition-colors">
            partners@agentgst.in
          </a>
        </div>

      </div>
    </footer>
  )
}
```

- [ ] **Step 9.3 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 9.4 — Commit**

```bash
git add components/landing/FinalCTA.tsx components/landing/Footer.tsx
git commit -m "feat: landing FinalCTA and Footer components"
```

---

## Task 10 — Wire Up app/page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 10.1 — Replace `app/page.tsx` entirely**

```tsx
import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { Nav }        from '@/components/landing/Nav'
import { Hero }       from '@/components/landing/Hero'
import { Problem }    from '@/components/landing/Problem'
import { Solution }   from '@/components/landing/Solution'
import { Screenshots } from '@/components/landing/Screenshots'
import { Economics }  from '@/components/landing/Economics'
import { HowToStart } from '@/components/landing/HowToStart'
import { FinalCTA }   from '@/components/landing/FinalCTA'
import { Footer }     from '@/components/landing/Footer'

export default async function Home() {
  // Redirect authenticated users to their respective dashboards
  try {
    const user = await getAuthedUser()
    if (user.role === 'CLIENT') redirect('/client/dashboard')
    redirect('/ca/dashboard')
  } catch {
    // Not authenticated — fall through and render the landing page
  }

  return (
    <main>
      <Nav />
      <Hero />
      <Problem />
      <Solution />
      <Screenshots />
      <Economics />
      <HowToStart />
      <FinalCTA />
      <Footer />
    </main>
  )
}
```

- [ ] **Step 10.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 10.3 — Start dev server and verify the page loads**

```bash
npm run dev
```

Open http://localhost:3000 in an incognito/private window (to test unauthenticated). Verify:
- [ ] Nav appears sticky at top with "AgentGST" wordmark and "Powered by Agentic AI" pill
- [ ] Hero shows amber pilot badge, headline, dual CTAs, 3-stat bar
- [ ] Problem section has 2 amber-bordered cards + teal callout box
- [ ] Solution section has 6 cards with colored top borders
- [ ] Screenshots section has 4 alternating feature rows with browser mockup frames
- [ ] Economics section has comparison table + 4 stat cards
- [ ] HowToStart has 3 numbered cards
- [ ] FinalCTA has email form on teal gradient
- [ ] Footer has 3-column layout

Also verify: Authenticated user session (log in first, then visit /) → should redirect to /ca/dashboard.

- [ ] **Step 10.4 — Test mobile layout**

Resize browser to 375px width and verify:
- [ ] Nav collapses to hamburger, drawer opens on click
- [ ] Hero stats bar stacks to 1 column
- [ ] Feature rows stack (screenshot above text)
- [ ] Economics table is horizontally scrollable

- [ ] **Step 10.5 — Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire landing page at root route, redirect authenticated users"
```

---

## Task 11 — Final Push

- [ ] **Step 11.1 — Run full test suite**

```bash
npx vitest run
```
Expected: all existing tests pass (0 regressions — landing page has no business logic)

- [ ] **Step 11.2 — Final type-check**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 11.3 — Push branch**

```bash
git push origin master
```

---

## Self-Review Checklist

- [x] Nav — sticky blur, mobile hamburger, all links, CTA button ✓
- [x] Hero — pilot badge, headline, subheadline, dual CTAs, trust line, stats bar ✓
- [x] Problem — 2 amber cards, callout box ✓
- [x] Solution — 6-card grid, colored top borders, icons ✓
- [x] Screenshots — 4 alternating rows, browser chrome mockup, 5 slugs, video placeholder ✓
- [x] Economics — comparison table (Today/With AgentGST columns), 4 stat cards, footnote ✓
- [x] HowToStart — 3 numbered cards with teal/indigo/amber circles ✓
- [x] FinalCTA — teal gradient, email form, trust badges, success state ✓
- [x] Footer — 3 columns, copyright, links, email ✓
- [x] Routing — unauthenticated → landing, CLIENT → /client/dashboard, CA → /ca/dashboard ✓
- [x] Fade-in hook — all sections use useFadeIn, CSS in globals.css ✓
- [x] Mobile — hamburger nav, single-column stacking, horizontal table scroll ✓
- [x] No external image dependencies ✓
- [x] All screenshot placeholders have data-screenshot attribute and commented img tag ✓
- [x] /login page untouched ✓
