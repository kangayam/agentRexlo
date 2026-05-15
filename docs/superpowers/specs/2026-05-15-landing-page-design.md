# AgentGST Landing Page — Design Spec
**Date:** 2026-05-15  
**Status:** Approved

---

## Goal

Build a complete, production-quality marketing landing page for AgentGST at `/`. Unauthenticated visitors see the landing page. Authenticated users are redirected to their dashboards as before.

---

## Routing

`app/page.tsx` becomes the landing page entry point:
- Authenticated CLIENT → redirect `/client/dashboard`
- Authenticated CA → redirect `/ca/dashboard`
- Unauthenticated → render `<LandingPage />` (no redirect to `/login`)

---

## File Structure

```
app/page.tsx                      Modified — landing entry point
app/layout.tsx                    Update metadata only
app/globals.css                   Add smooth-scroll + fade-in animation

components/landing/
  Nav.tsx                         Sticky nav with blur, mobile hamburger
  Hero.tsx                        Dark hero, stats bar, dual CTAs
  Problem.tsx                     2-column problem cards + callout
  Solution.tsx                    6-card solution grid
  Screenshots.tsx                 4 alternating feature rows + video placeholder
  Economics.tsx                   Comparison table + 4 stat cards
  HowToStart.tsx                  3 numbered step cards
  FinalCTA.tsx                    Email form + trust badges
  Footer.tsx                      3-column footer
```

---

## Design Tokens

| Token | Value |
|---|---|
| Background dark | `#0f1629` |
| Background light | `#f8fafc` |
| Accent teal | `#00bfad` |
| Accent indigo | `#6366f1` |
| Accent amber | `#f59e0b` |
| Text primary | `#0f172a` |
| Text on dark | `#f1f5f9` |
| Text muted | `#64748b` |
| Border radius | `rounded-xl` cards, `rounded-2xl` large cards |

Font: Inter (already loaded in `app/layout.tsx`)

---

## Sections (in order)

1. **Nav** — sticky, blur backdrop, "AgentGST" wordmark + "Powered by Agentic AI" pill, right links + "Join Pilot Program" CTA, mobile hamburger
2. **Hero** — dark bg, amber pilot badge, headline, subheadline, dual CTAs, trust line, 3-stat bar
3. **Problem** — light bg, 2 problem cards, full-width callout box
4. **Solution** — dark bg, 6-card grid (2×3), each with colored top border
5. **Screenshots** — light bg, 4 alternating rows (screenshot mockup + text), video placeholder
6. **Economics** — light bg, styled comparison table, 2×2 stat grid, footnote
7. **HowToStart** — dark bg, 3 numbered step cards
8. **FinalCTA** — teal gradient bg, email form, trust badges
9. **Footer** — dark bg, 3-column

---

## Screenshot Placeholders

Each screenshot placeholder:
- Browser chrome mockup (gray rounded top bar with 3 colored dots)
- Placeholder body: `bg-slate-100 rounded-b-xl h-80` with feature name centered
- `data-screenshot="{slug}"` attribute for easy future replacement
- Commented-out `<img>` tag ready to uncomment

Slugs: `ca-dashboard`, `itc-leakage`, `portfolio-analytics`, `client-portal`, `client-portal-preview`

---

## Animations

- `scroll-behavior: smooth` on `<html>`
- Fade-in on scroll using Intersection Observer via a `useFadeIn` hook or Tailwind `animate-` class
- Applied to each section wrapper

---

## Mobile

- All sections: single column on mobile
- Nav: hamburger menu (toggle state)
- Stats bar: 1 column
- Feature rows: screenshot above text
- Comparison table: horizontal scroll
- Font sizes scale down via Tailwind responsive prefixes

---

## Constraints

- No external image dependencies
- No heavy animation libraries (vanilla Intersection Observer)
- `lucide-react` for all icons (already a dependency)
- shadcn/ui components where appropriate (Button)
- Must pass `npx tsc --noEmit` clean
