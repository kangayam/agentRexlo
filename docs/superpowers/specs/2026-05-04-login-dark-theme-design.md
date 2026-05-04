# Login Page — Dark Theme Retheme Design

## Goal

Swap the existing login page color scheme from the current dark-navy + orange palette to a new three-token dark theme: background `#021C2E`, secondary panel `#0A2F4A`, and muted-peach accent `#E6B8A2`. All layout, copy, and functional behaviour remain unchanged.

## Scope

Single file change: `app/(auth)/login/page.tsx`. No new components, no routing changes, no API changes. The `animate-pulse-dot` keyframe in `app/globals.css` is already present and stays as-is.

## Color tokens (old → new)

| Usage | Old value | New value |
|---|---|---|
| Page background | `#0a1628` | `#021C2E` |
| Right panel background | `url(/login-bg.jpg)` with overlay | `#0A2F4A` solid + subtle radial gradient |
| Login card background | `#ffffff` (white) | `#021C2E` |
| Login card border | none | `1px solid rgba(230,184,162,0.18)` |
| Accent color | `#f97316` (orange) | `#E6B8A2` (muted peach) |
| Login button background | `#0a1628` | `#E6B8A2` |
| Login button text | `#ffffff` | `#021C2E` |
| Sign Up button border | `#d1d5db` | `rgba(230,184,162,0.35)` |
| Sign Up button text | `#0a1628` | `#E6B8A2` |
| Nav "Contact Support" border | none | `rgba(230,184,162,0.35)` |
| Nav "Contact Support" text | white | `#E6B8A2` |
| Input border | `#e5e7eb` (light) | `rgba(230,184,162,0.2)` |
| Input background | `#f9fafb` (light) | `rgba(255,255,255,0.05)` |
| Input text | `#111827` | `#ffffff` |
| Input placeholder | `#9ca3af` | `rgba(255,255,255,0.25)` |
| Focus ring | `#f97316` | `#E6B8A2` |
| Card title text | `#021C2E` | `#ffffff` |
| Card subtitle text | `#6b7280` | `rgba(255,255,255,0.4)` |
| Field label text | `#374151` | `rgba(255,255,255,0.7)` |
| Forgot Password link | `#f97316` | `#E6B8A2` |
| Checkbox accent-color | `#f97316` | `#E6B8A2` |
| Remember label text | `#6b7280` | `rgba(255,255,255,0.4)` |
| Security note text | `#9ca3af` | `rgba(255,255,255,0.28)` |
| Shield icon bg | `rgba(249,115,22,0.15)` | `rgba(230,184,162,0.15)` |
| Shield icon border | `rgba(249,115,22,0.3)` | `rgba(230,184,162,0.3)` |
| Shield icon color | `#f97316` | `#E6B8A2` |
| Badge background | `rgba(249,115,22,0.1)` | `rgba(230,184,162,0.1)` |
| Badge border | `rgba(249,115,22,0.3)` | `rgba(230,184,162,0.28)` |
| Stat card border | `rgba(249,115,22,0.15)` | `rgba(230,184,162,0.12)` |
| Nav link text | `rgba(255,255,255,0.6)` | unchanged |
| Footer text | `rgba(255,255,255,0.2)` | unchanged |

## Typography change

Headline (`h1`):
- Old: `fontSize: 44, letterSpacing: '-1.5px'`
- New: `fontSize: 36, letterSpacing: '-1.2px'`
- `fontWeight: 900` and `lineHeight: 1.1` stay the same

## Right panel treatment

Remove the `url(/login-bg.jpg)` background image reference. Replace with:
- `backgroundColor: '#0A2F4A'`
- Pseudo-element (or inline gradient via `::before` equivalent using a nested `div`) with `background: radial-gradient(ellipse at 70% 40%, rgba(230,184,162,0.06) 0%, transparent 60%)`

Because Tailwind arbitrary values don't support complex radial gradients cleanly, the right panel div gets `style={{ background: '#0A2F4A', position: 'relative', overflow: 'hidden' }}`. A nested `<div>` with `position: absolute; inset: 0; background: radial-gradient(...)` provides the glow effect.

## What does NOT change

- Layout (54/46 split, absolute nav, absolute footer)
- All copy (headline text, badge label, stat values, card title/subtitle, button labels, security note)
- All functional logic (`handleSubmit`, error state, loading spinner, eye toggle, remember checkbox)
- `animate-pulse-dot` animation (already in globals.css with matching opacity/scale values)
- Stat numbers (28px, fontWeight 800) — only color changes from `#f97316` to `#E6B8A2`
- `next/font/google` Inter setup in layout.tsx

## Testing

- Visual: Load `/login` in browser; confirm no orange pixels remain
- Functional: Login with valid credentials still redirects correctly
- Error state: Invalid credentials still displays error message inline
- Eye toggle: Shows/hides password, SVG renders in peach
- No automated test needed — purely cosmetic swap with no logic change
