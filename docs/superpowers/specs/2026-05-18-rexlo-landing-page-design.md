# Rexlo Landing Page — Design Spec
**Date:** 2026-05-18  
**Status:** Approved  
**Repo:** agentRexlo (`/Users/bhaskar/documents/github/agentRexlo`)

---

## 1. Overview

A best-in-class marketing landing page for **Rexlo** — an AI-powered GST Intelligence Platform for Indian Chartered Accountants and businesses. The page targets two audiences (CAs and businesses/CFOs), uses a Stripe-inspired design system, and drives visitors toward a demo request.

---

## 2. Brand

- **Company name:** Rexlo
- **Logo:** `/public/rexlo-logo.png` (dark navy geometric mark)
- **Tagline:** Turn GST Compliance Into Your Biggest Revenue Driver
- **Contact:** partners@gstrecon.in

---

## 3. Design System

### Style
- **Aesthetic:** Stripe-inspired — white background, colorful gradient blobs, bold dark typography, generous whitespace
- **Background:** `#ffffff` (white) with radial gradient blobs as decoration
- **Text:** `#0f172a` (slate-900) for headings, `#64748b` (slate-500) for body
- **Accent / Primary:** `#6366f1` (indigo-500)
- **Gradient:** `linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)` — used on gradient text and blobs
- **Border:** `#e2e8f0` (slate-200)
- **Font:** System font stack (`-apple-system, BlinkMacSystemFont, 'Inter', sans-serif`)

### Key UI Patterns
- Gradient text on headline key phrase (`<span>` with `background-clip: text`)
- Radial gradient blobs (absolute positioned, pointer-events none) in hero and CTA sections
- Pill badges: `background:#f0f0ff; border:1px solid #c7d2fe; border-radius:999px; color:#6366f1`
- Primary button: `background:#6366f1; color:#fff; border-radius:7px`
- Outline button: `border:1px solid #c7d2fe; color:#6366f1; border-radius:7px`

---

## 4. Audiences

Two equal audiences served by the same page:
- **CAs (Chartered Accountants):** Scale advisory practice, manage more clients, use white-label portal
- **Businesses / CFOs:** Recover ITC leakage, reduce notices, automate compliance

---

## 5. Page Structure (10 sections)

### Section 1 — Navigation (Sticky)
- **Logo:** Rexlo SVG/PNG (left)
- **Links:** Products · Solutions · Resources · Pricing (center)
- **Actions:** Sign In (text link) · Request a Demo (indigo button, right)
- **Behaviour:** Transparent → white with shadow on scroll

### Section 2 — Hero
- **Layout:** Centered, white background with indigo + pink gradient blobs
- **Badge:** `✦ Powered by Agentic AI` (pill, indigo)
- **H1:** "Turn GST Compliance Into Your Biggest Revenue Driver"
- **Key phrase gradient:** "Biggest Revenue Driver" in indigo→violet→pink gradient
- **Subtext:** "AI agents handle IMS reconciliation, ITC recovery, and client reports — so your firm earns more from every client without working more hours."
- **CTAs:** `Request a Demo →` (primary) + `▶ Watch 2-min overview` (outline)
- **Dashboard peek:** Mock dark dashboard (stat cards) peeking up from bottom with indigo glow shadow

### Section 3 — Social Proof / Trusted By
- **Copy:** "Trusted by CA firms managing ₹500Cr+ in ITC across India"
- **Elements:** 5 placeholder CA firm name chips (greyed out)
- **Style:** Light grey chips on white, centered

### Section 4 — Who It's For (Audience Split)
- **Heading:** "Built for the whole GST ecosystem"
- **Layout:** Two equal cards side by side
- **CA Card** (purple tint `#f5f3ff`, border `#ddd6fe`):
  - Tag: FOR CHARTERED ACCOUNTANTS
  - H: Scale your advisory practice 3× with AI
  - Bullets: Auto-reconcile IMS vs Tally · White-label client portal · 3× client capacity · Revenue ₹8K→₹17K/client
  - CTA link: Join CA Pilot Program →
- **Business Card** (green tint `#f0fdf4`, border `#bbf7d0`):
  - Tag: FOR BUSINESSES & CFOS
  - H: Stop losing 2–5% of eligible ITC every quarter
  - Bullets: 99% reconciliation accuracy · Pre-filing protection · 60% fewer notices · Working capital freed in weeks
  - CTA link: See Business ROI Calculator →

### Section 5 — Key Metrics Bar
- **4 stats** displayed as equal horizontal cells with gradient numbers:
  - 80% — Less tax prep time
  - 99% — Reconciliation accuracy
  - 5× — ROI in Month 1
  - 60% — Fewer govt notices
- **Style:** Border, no background, animated counters on scroll

### Section 6 — Product Showcase ("See It In Action")
- **Heading:** "See It In Action"
- **Subheading:** "Real Intelligence. Not Just Dashboards."
- **Body:** "Here's what you and your clients actually see."
- **Layout:** 3 alternating rows (text left + screenshot right, then reversed, then left again)

**Row 1 — CA Dashboard**
- Tag: FOR CA FIRMS
- H: Your Entire Client Portfolio, Intelligently Monitored
- Body: See ITC cleared, ITC at risk, quality scores, and urgent actions across all your clients — in one view. No more chasing Excel sheets or calling clients to check status.
- Pills: `✓ ITC Leakage Alerts` · `✓ Quality Scores` · `✓ Urgent Actions`
- Screenshot: `/public/ca-dashboard.png`

**Row 2 — Client Portal / Action Queue** (reversed)
- Tag: ACTION QUEUE
- H: Plain-English instructions for every invoice
- Body: Clients see exactly what to do on the GSTN portal — no jargon, no confusion. Accept, reject, or defer. Mark done. ITC protected.
- Pills: `✓ ITC Trend Charts` · `✓ Quality Score Trends` · `✓ Export PDF`
- Screenshot: `/public/client-portal.png`

**Row 3 — ITC Recovery**
- Tag: ITC RECOVERY
- H: Know Exactly Where Every Rupee Is Leaking
- Body: AI breaks down ITC leakage by root cause — value mismatches, non-filing suppliers, invoices missing from books — with recoverable amounts flagged and prioritized by rupee impact.
- Pills: `✓ Root Cause Analysis` · `✓ Recoverable ITC` · `✓ Supplier Risk`
- Screenshot: `/public/itc-leakage.png`

### Section 7 — Product Video
- **Heading:** "See Rexlo in action — 2 minutes"
- **Subtext:** "From file upload to action queue. Watch a full reconciliation cycle."
- **Layout:** Centered play button with indigo glow, gradient blob decoration
- **Implementation:** YouTube/Loom embed (URL TBD by founder)

### Section 8 — Pricing
- **Heading:** "Simple, value-based pricing"
- **Subtext:** "Start free for 30 days. No credit card."
- **3 tiers** (middle card highlighted with indigo border):
  - Growth: ₹60K–₹1.2L/year · ₹10–50Cr turnover
  - Scale (featured): ₹2L–₹5L/year · ₹50–200Cr turnover
  - Enterprise: Custom · ₹200Cr+ turnover

### Section 9 — Final CTA
- **Eyebrow:** 30-DAY FREE PILOT
- **H:** "Let's recover your money. Start with 5 clients. No commitment."
- **Body:** "We handle setup, data migration, and training. You show up for the first reconciliation review."
- **CTAs:** `Request a Demo →` (primary) + `Talk to us on WhatsApp` (outline)
- **Fine print:** "30-day free pilot · No credit card · Cancel anytime"
- **Background:** Indigo-tinted gradient (`#f5f3ff` to `#ede9fe`) with blob

### Section 10 — Footer
- **Logo** (left)
- **Links:** Products · Pricing · CA Partners · Privacy · partners@gstrecon.in
- **Copyright:** © 2026 Rexlo. All rights reserved.

---

## 6. Assets Available

| File | Location | Used In |
|------|----------|---------|
| `rexlo-logo.png` | `/public/` | Nav, Footer |
| `ca-dashboard.png` | `/public/` | Section 6, Row 1 |
| `client-portal.png` | `/public/` | Section 6, Row 2 |
| `itc-leakage.png` | `/public/` | Section 6, Row 3 |
| `portfolio-analytics.png` | `/public/` | Section 6, Row 1 (alt) |

---

## 7. Tech Stack

- **Framework:** Next.js 14 (App Router) — already set up in repo
- **Styling:** Tailwind CSS + shadcn/ui
- **Hosting:** Vercel (auto-deploy from `main`)
- **Forms:** Demo request form → email to `partners@gstrecon.in` via Resend or Formspree
- **Analytics:** Vercel Analytics

---

## 8. Key Decisions

1. **Single page** — all 10 sections on one scroll, no sub-pages for MVP
2. **Static + one API route** — demo form submission only; no DB needed
3. **Real screenshots** used directly as `<img>` tags (not CSS backgrounds) for sharpness
4. **Mobile responsive** — all sections stack to single column on mobile
5. **No CMS for MVP** — copy lives in code; can migrate to Contentful/Sanity later
