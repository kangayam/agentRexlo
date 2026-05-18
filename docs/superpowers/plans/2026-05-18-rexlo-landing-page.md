# Rexlo Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing landing page components to match the Rexlo design spec — Stripe-inspired white + indigo design, new copy, real product screenshots, and 3 new sections (TrustedBy, WhoItsFor, StatsBar, Pricing).

**Architecture:** Each section is a standalone React component in `components/landing/`. The root `app/page.tsx` assembles them in order. No DB or API routes needed except the existing demo form submission. All screenshots served as static assets from `public/`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, Resend/Formspree for form.

---

## File Map

| File | Action | What it does |
|------|--------|-------------|
| `components/landing/Nav.tsx` | **Modify** | Rexlo logo, updated links, indigo CTA |
| `components/landing/Hero.tsx` | **Rewrite** | Centered layout, gradient blobs, mock dashboard peek |
| `components/landing/TrustedBy.tsx` | **Create** | Social proof bar |
| `components/landing/WhoItsFor.tsx` | **Create** | Two-card audience split (CA + Business) |
| `components/landing/StatsBar.tsx` | **Create** | 4-stat metrics row |
| `components/landing/Screenshots.tsx` | **Modify** | 3 rows matching spec, correct screenshots |
| `components/landing/Pricing.tsx` | **Create** | 3-tier pricing cards |
| `components/landing/FinalCTA.tsx` | **Modify** | Indigo tint bg, new copy, WhatsApp button |
| `components/landing/Footer.tsx` | **Modify** | Rexlo branding, updated links |
| `app/page.tsx` | **Modify** | Add TrustedBy, WhoItsFor, StatsBar, Pricing |

---

## Task 1: Update Nav

**Files:**
- Modify: `components/landing/Nav.tsx`

- [ ] **Step 1: Replace Nav.tsx with updated version**

```tsx
'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'

export function Nav() {
  const [open, setOpen] = useState(false)

  const links = [
    { label: 'Products',   href: '#features'   },
    { label: 'Solutions',  href: '#who-its-for' },
    { label: 'Resources',  href: '#screenshots' },
    { label: 'Pricing',    href: '#pricing'     },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/rexlo-logo.png"
            alt="Rexlo"
            width={120}
            height={36}
            priority
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.label} href={l.href}
               className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">
              {l.label}
            </a>
          ))}
          <a href="/login"
             className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
            Sign in
          </a>
          <a href="#cta"
             className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold
                        hover:bg-indigo-700 transition-colors shadow-sm">
            Request a Demo
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-600 hover:text-slate-900 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-1">
          {links.map(l => (
            <a key={l.label} href={l.href}
               onClick={() => setOpen(false)}
               className="block py-3 text-sm text-slate-600 hover:text-slate-900 transition-colors
                          font-medium border-b border-slate-100">
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <a href="/login"
               onClick={() => setOpen(false)}
               className="block w-full text-center py-3 rounded-lg border border-indigo-200
                          text-indigo-600 text-sm font-semibold">
              Sign in
            </a>
            <a href="#cta"
               onClick={() => setOpen(false)}
               className="block w-full text-center py-3 rounded-lg bg-indigo-600 text-white
                          text-sm font-bold hover:bg-indigo-700 transition-colors">
              Request a Demo
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd /Users/bhaskar/documents/github/agentRexlo
npm run build 2>&1 | tail -20
```
Expected: No TypeScript or build errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/Nav.tsx
git commit -m "feat: update Nav to Rexlo branding and indigo design"
```

---

## Task 2: Rewrite Hero

**Files:**
- Modify: `components/landing/Hero.tsx`

- [ ] **Step 1: Replace Hero.tsx with centered Stripe-style layout**

```tsx
'use client'
import Image from 'next/image'

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
              { val: '₹2,20,443', lbl: 'ITC Cleared',    color: 'text-emerald-400' },
              { val: '₹13,72,253', lbl: 'ITC Leakage',   color: 'text-red-400'     },
              { val: '41 / 100',  lbl: 'Quality Score',  color: 'text-blue-400'    },
              { val: '2',         lbl: 'Active Clients', color: 'text-amber-400'   },
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/Hero.tsx
git commit -m "feat: rewrite Hero to centered Stripe-style with gradient blobs"
```

---

## Task 3: Create TrustedBy

**Files:**
- Create: `components/landing/TrustedBy.tsx`

- [ ] **Step 1: Create TrustedBy.tsx**

```tsx
export function TrustedBy() {
  const firms = [
    'MEHTA & CO.',
    'RAJESH ASSOCIATES',
    'SURESH CPA',
    'SHARMA & PARTNERS',
    'VENKAT TAX',
  ]

  return (
    <section className="bg-white border-y border-slate-100 py-10 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
          Trusted by CA firms managing ₹500Cr+ in ITC across India
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {firms.map(f => (
            <span key={f}
                  className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200
                             text-xs font-bold text-slate-400 tracking-wide">
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/TrustedBy.tsx
git commit -m "feat: add TrustedBy social proof section"
```

---

## Task 4: Create WhoItsFor

**Files:**
- Create: `components/landing/WhoItsFor.tsx`

- [ ] **Step 1: Create WhoItsFor.tsx**

```tsx
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/WhoItsFor.tsx
git commit -m "feat: add WhoItsFor audience split section"
```

---

## Task 5: Create StatsBar

**Files:**
- Create: `components/landing/StatsBar.tsx`

- [ ] **Step 1: Create StatsBar.tsx**

```tsx
const stats = [
  { value: '80%', label: 'Less tax prep time'       },
  { value: '99%', label: 'Reconciliation accuracy'  },
  { value: '5×',  label: 'ROI in Month 1'           },
  { value: '60%', label: 'Fewer govt notices'       },
]

export function StatsBar() {
  return (
    <section className="bg-white py-6 px-6">
      <div className="max-w-5xl mx-auto border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label}
                 className={`px-8 py-8 text-center
                   ${i < stats.length - 1 ? 'border-r border-slate-200' : ''}
                   ${i < 2 ? 'border-b border-slate-200 md:border-b-0' : ''}`}>
              <div className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-violet-500
                              bg-clip-text text-transparent mb-1">
                {s.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/StatsBar.tsx
git commit -m "feat: add StatsBar metrics section"
```

---

## Task 6: Update Screenshots

**Files:**
- Modify: `components/landing/Screenshots.tsx`

- [ ] **Step 1: Replace Screenshots.tsx to match spec exactly (3 rows, correct screenshots, indigo pills)**

```tsx
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
    tagColor: 'text-indigo-600',
    heading: 'Your Entire Client Portfolio, Intelligently Monitored',
    body: 'See ITC cleared, ITC at risk, quality scores, and urgent actions across all your clients — in one view. No more chasing Excel sheets or calling clients to check status.',
    pills: ['ITC Leakage Alerts', 'Quality Scores', 'Urgent Actions'],
  },
  {
    screenshotLeft: true,
    screenshot: { slug: 'client-portal', label: 'Client Action Queue' },
    tag: 'ACTION QUEUE',
    tagColor: 'text-indigo-600',
    heading: 'Plain-English Instructions for Every Invoice',
    body: 'Clients see exactly what to do on the GSTN portal — no jargon, no confusion. Accept, reject, or defer. Mark done. ITC protected.',
    pills: ['ITC Trend Charts', 'Quality Score Trends', 'Export PDF'],
  },
  {
    screenshotLeft: false,
    screenshot: { slug: 'itc-leakage', label: 'ITC Leakage Analytics' },
    tag: 'ITC RECOVERY',
    tagColor: 'text-indigo-600',
    heading: 'Know Exactly Where Every Rupee Is Leaking',
    body: 'AI breaks down ITC leakage by root cause — value mismatches, non-filing suppliers, invoices missing from books — with recoverable amounts flagged and prioritized by rupee impact.',
    pills: ['Root Cause Analysis', 'Recoverable ITC', 'Supplier Risk'],
  },
]

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                     bg-indigo-50 border border-indigo-200 text-indigo-600
                     text-xs font-semibold">
      ✓ {label}
    </span>
  )
}

function ScreenshotCard({ slug, label }: { slug: string; label: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/60 w-full">
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
    <section id="screenshots" className="bg-slate-50 py-24 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-indigo-600 mb-4">
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
          <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center mb-5
                          shadow-lg shadow-indigo-200 relative z-10">
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/Screenshots.tsx
git commit -m "feat: update Screenshots to 3-row spec with indigo pills"
```

---

## Task 7: Create Pricing

**Files:**
- Create: `components/landing/Pricing.tsx`

- [ ] **Step 1: Create Pricing.tsx**

```tsx
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/Pricing.tsx
git commit -m "feat: add Pricing section with 3 tiers"
```

---

## Task 8: Update FinalCTA

**Files:**
- Modify: `components/landing/FinalCTA.tsx`

- [ ] **Step 1: Replace FinalCTA.tsx**

```tsx
'use client'
import { useState } from 'react'

const trustBadges = ['30-day free pilot', 'No credit card', 'Cancel anytime']

export function FinalCTA() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://formspree.io/f/xbdwveej', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError('Something went wrong. Please email us directly.')
      }
    } catch {
      setError('Something went wrong. Please email us directly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="cta" className="bg-violet-50 py-24 px-6 relative overflow-hidden">

      {/* Blob */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full
                      bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,transparent_70%)]" />

      <div className="relative z-10 max-w-2xl mx-auto text-center">

        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-indigo-600 mb-5">
          30-DAY FREE PILOT
        </p>
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 leading-tight">
          Let&apos;s recover your money.<br />
          Start with 5 clients. No commitment.
        </h2>
        <p className="text-base text-slate-500 mb-10 leading-relaxed">
          We handle setup, data migration, and training. You show up for the first
          reconciliation review.
        </p>

        {submitted ? (
          <div className="bg-white border border-indigo-200 rounded-2xl px-6 py-5 mb-6">
            <p className="text-slate-900 font-semibold text-base">
              🎉 Thanks! We&apos;ll be in touch within 24 hours.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="flex-1 h-12 px-4 rounded-xl bg-white border border-slate-200
                           text-slate-900 placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-12 px-6 rounded-xl bg-indigo-600 text-white font-bold text-sm
                           hover:bg-indigo-700 transition-colors whitespace-nowrap
                           disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-indigo-200">
                {loading ? 'Sending…' : 'Request a Demo →'}
              </button>
            </form>
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <a href="https://wa.me/91XXXXXXXXXX"
             target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                        border border-indigo-200 text-indigo-600 text-sm font-semibold
                        hover:bg-indigo-50 transition-colors bg-white">
            💬 Talk to us on WhatsApp
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {trustBadges.map(b => (
            <span key={b} className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 inline-block" />
              {b}
            </span>
          ))}
        </div>

      </div>
    </section>
  )
}
```

> **Note:** Replace `91XXXXXXXXXX` with the actual WhatsApp number before launch.

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/FinalCTA.tsx
git commit -m "feat: update FinalCTA to indigo design with WhatsApp CTA"
```

---

## Task 9: Update Footer

**Files:**
- Modify: `components/landing/Footer.tsx`

- [ ] **Step 1: Check current Footer content**

```bash
cat /Users/bhaskar/documents/github/agentRexlo/components/landing/Footer.tsx
```

- [ ] **Step 2: Replace Footer.tsx**

```tsx
import Image from 'next/image'

export function Footer() {
  const links = [
    { label: 'Products',    href: '#features'    },
    { label: 'Pricing',     href: '#pricing'     },
    { label: 'CA Partners', href: '#cta'         },
    { label: 'Privacy',     href: '/privacy'     },
  ]

  return (
    <footer className="bg-white border-t border-slate-200 py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center
                      justify-between gap-6 flex-wrap">

        {/* Logo */}
        <Image
          src="/rexlo-logo.png"
          alt="Rexlo"
          width={100}
          height={30}
          className="h-7 w-auto object-contain"
        />

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6">
          {links.map(l => (
            <a key={l.label} href={l.href}
               className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
              {l.label}
            </a>
          ))}
          <a href="mailto:partners@gstrecon.in"
             className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
            partners@gstrecon.in
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-slate-400">
          © 2026 Rexlo. All rights reserved.
        </p>

      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add components/landing/Footer.tsx
git commit -m "feat: update Footer to Rexlo branding"
```

---

## Task 10: Wire All Sections in page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update page.tsx to include all sections in correct order**

```tsx
import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { Nav }        from '@/components/landing/Nav'
import { Hero }       from '@/components/landing/Hero'
import { TrustedBy }  from '@/components/landing/TrustedBy'
import { WhoItsFor }  from '@/components/landing/WhoItsFor'
import { StatsBar }   from '@/components/landing/StatsBar'
import { Screenshots } from '@/components/landing/Screenshots'
import { Pricing }    from '@/components/landing/Pricing'
import { FinalCTA }   from '@/components/landing/FinalCTA'
import { Footer }     from '@/components/landing/Footer'

export default async function Home() {
  try {
    const user = await getAuthedUser()
    if (user.role === 'CLIENT') redirect('/client/dashboard')
    redirect('/ca/dashboard')
  } catch {
    // Not authenticated — render landing page
  }

  return (
    <main>
      <Nav />
      <Hero />
      <TrustedBy />
      <WhoItsFor />
      <StatsBar />
      <Screenshots />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  )
}
```

- [ ] **Step 2: Verify full build**

```bash
npm run build 2>&1 | tail -30
```
Expected: Build succeeds with no errors. Note any warnings but don't block on them.

- [ ] **Step 3: Start dev server and visually verify all sections**

```bash
npm run dev
```
Open http://localhost:3000 and check:
- [ ] Nav: Rexlo logo, correct links, indigo "Request a Demo" button
- [ ] Hero: Centered, gradient blobs, new headline, mock dashboard peek
- [ ] TrustedBy: 5 firm chips
- [ ] WhoItsFor: Two cards, purple CA + green Business
- [ ] StatsBar: 4 gradient number cells
- [ ] Screenshots: 3 rows with real screenshots and indigo pills
- [ ] Video: Play button with indigo styling
- [ ] Pricing: 3 tiers, Scale highlighted
- [ ] FinalCTA: Violet tint, email form, WhatsApp button
- [ ] Footer: Rexlo logo, correct links

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire all landing page sections in correct order"
```

---

## Task 11: Push to GitHub

- [ ] **Step 1: Push to remote**

```bash
git -C /Users/bhaskar/documents/github/agentRexlo push origin master 2>&1
```
Expected: All commits pushed to `https://github.com/kangayam/agentRexlo`

- [ ] **Step 2: Verify on GitHub**

Open https://github.com/kangayam/agentRexlo and confirm latest commits are visible.

---

## Post-Launch Checklist (Do before sharing URL publicly)

- [ ] Replace WhatsApp number `91XXXXXXXXXX` in `FinalCTA.tsx` with real number
- [ ] Add product video URL to Screenshots video section
- [ ] Replace placeholder CA firm names in `TrustedBy.tsx` with real pilot partners (when available)
- [ ] Add `og:image`, `og:title`, `og:description` meta tags in `app/layout.tsx` for social sharing
- [ ] Set up Formspree or Resend endpoint for demo form emails
