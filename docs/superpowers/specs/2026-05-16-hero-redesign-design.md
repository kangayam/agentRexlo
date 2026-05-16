# Hero Section Redesign — Design Spec
**Date:** 2026-05-16
**Status:** Approved
**Scope:** `components/landing/Hero.tsx`, `components/landing/Nav.tsx`

---

## What We're Changing

The current hero is a centered, dark-background layout (`bg-[#0f1629]`). We are replacing it with a two-column fintech SaaS hero with a light background, black typography, and the AgentGST product image on the right.

---

## Visual Design

| Property | Value |
|---|---|
| Page background | `#F4F9FB` (soft blue-grey) |
| Nav background | `#ffffff` with `1px solid #e2e8ec` bottom border |
| Hero background | `#F4F9FB` — no gradient |
| All body text | `#0d1f2d` (near-black) |
| Accent (logo, CTA, stat values) | `#00a896` (teal) |
| Font style | Inter / system-ui, tight letter-spacing (`-0.03em` headings) |

---

## Layout

Two-column grid: **52% left / 48% right**, `gap-13`, vertically centred.

### Left column
1. Amber pilot badge — `🚀 Now accepting CA Pilot Partners — 30 spots remaining`
2. H1 — `Turn GST Compliance Into / Your Biggest Revenue Driver` — `#0d1f2d`, `font-extrabold`, `text-4xl lg:text-5xl`
3. Sub-headline — `AI agents handle IMS reconciliation, ITC recovery, and client reports — so your firm earns more from every client without working more hours.` — `#0d1f2d`, `font-normal`
4. Two CTAs side by side:
   - Primary: teal filled — **Join Pilot Program**
   - Secondary: ghost border — **See How It Works**
5. Trust line: `30-day free pilot · No credit card · Cancel anytime` — small muted text
6. Stats bar (3 columns, white card, 1px border):
   - `5×` ROI in Month 1
   - `+₹36L` Annual Revenue Uplift
   - `3×` Client Capacity, Same Team

### Right column
`next/image` rendering `public/agentgst-hero.png`, `object-contain`, drop shadow, rounded corners.

---

## Nav Changes

| Property | Before | After |
|---|---|---|
| Background | `#0f1629/85` dark | `#ffffff` white |
| Logo colour | teal | teal (unchanged) |
| Link colour | `slate-300` | `#334155` dark |
| CTA button | teal | teal (unchanged) |
| Border | none | `1px solid #e2e8ec` bottom |

---

## Copy (Option C — approved)

**Headline:**
> Turn GST Compliance Into Your Biggest Revenue Driver

**Sub-headline:**
> AI agents handle IMS reconciliation, ITC recovery, and client reports — so your firm earns more from every client without working more hours.

---

## Files Changed

| File | Change |
|---|---|
| `components/landing/Hero.tsx` | Full rewrite — two-column, light background, new copy |
| `components/landing/Nav.tsx` | Light mode — white background, dark links |
| `public/agentgst-hero.png` | Add image (manual step — user provides file) |
