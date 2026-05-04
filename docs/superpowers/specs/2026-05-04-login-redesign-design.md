# Login Page Redesign — Design Spec

**Date:** 2026-05-04  
**Status:** Approved  
**Scope:** Replace `app/(auth)/login/page.tsx` with a full-viewport hero layout

---

## Overview

Redesign the `/login` route as a full-viewport split-panel hero page. The existing minimal card is replaced with a marketing-grade layout that establishes brand credibility while keeping the login form prominent.

---

## Layout

Full-height flex row (`height: 100vh`, `overflow: hidden`), dark navy background (`#0a1628`).

- **Left panel:** 54% width
- **Right panel:** 46% width, photo background

---

## Navigation (position: absolute, top)

- Left: Logo text **"GST Ledger"** — Inter 700, white, 18px
- Right: "Help" link · "Documentation" link · "Contact Support" outline button
- Links: Inter 500, `rgba(255,255,255,0.75)`, 13.5px
- Button: `1.5px solid rgba(255,255,255,0.35)`, border-radius 7px, transparent bg
- Padding: `22px 56px`

---

## Left Panel

Padding: `140px 64px 80px`. Flex column layout.

### Badge
- Orange-tinted pill: `rgba(249,115,22,0.12)` bg, `1px solid rgba(249,115,22,0.35)` border, border-radius 999px
- Content: pulsing orange dot (8px, `#f97316`, CSS `animation: pulse 2s ease-in-out infinite`) + uppercase text **"AI-POWERED PLATFORM"**
- Text: Inter 700, 11px, `#f97316`, letter-spacing 1.2px

### Headline
- Text: **"Discover AI-powered GST reconciliation and client-centric solutions tailored for Chartered Accountants in India."**
- Font: Inter 900, 44px, line-height 1.08, letter-spacing -1.5px, color `#fff`

### Subtext
- Text: **"GST compliance that used to take 80 hours now takes 25."**
- Font: Inter 400, 15.5px, `rgba(255,255,255,0.45)`, line-height 1.6, max-width 420px

### Stat Cards (row of 3)
Glassmorphism cards — `rgba(255,255,255,0.05)` bg, `1px solid rgba(255,255,255,0.09)` border, border-radius 14px, `backdrop-filter: blur(4px)`, padding `20px 22px`, equal flex.

| Number | Label |
|--------|-------|
| 69% | TIME SAVED |
| 10K+ | CA FIRMS |
| 99.9% | ACCURACY |

- Numbers: Inter 800, 28px, `#f97316`
- Labels: Inter 600, 10px, `rgba(255,255,255,0.35)`, uppercase, letter-spacing 0.8px

### CTA Button
- Label: **"Learn more →"**
- Style: `background #f97316`, white text, Inter 700, 15px, padding `14px 28px`, border-radius 9px, width fit-content

---

## Right Panel

46% width. Background: static coastal photo bundled at `/public/login-bg.jpg` (`background-size: cover`, `background-position: center`). A gradient overlay (`linear-gradient(to right, rgba(10,22,40,0.45) 0%, transparent 50%)`) softens the left edge of the photo so the card reads clearly.

### Login Card
White card, border-radius 20px, padding `38px 34px 32px`, width 370px, `box-shadow: 0 32px 80px rgba(0,0,0,0.55)`. Centred vertically in the panel.

**Header**
- Title: **"Welcome Back"** — Inter 700, 21px, `#0a1628`, centered
- Subtitle: **"Please enter your credentials to access the ledger."** — Inter 400, 12.5px, `#6b7280`, centered

**Fields**

1. **Email or User ID** — label + text input, placeholder `name@company.com`, height 42px, border `1.5px solid #e5e7eb`, border-radius 8px, bg `#f9fafb`
2. **Password** — label "Password" (left) + "Forgot Password?" link (right, `#f97316`) on the same line above the input; input has eye-toggle icon button on the right; routes to `/reset`
3. **Remember User ID** — checkbox + label row below password

**Buttons**
- **Login** (primary): full-width, height 44px, bg `#0a1628`, white text, Inter 700, border-radius 9px. Shows spinner + disabled state while submitting. On success: redirects to `data.redirectTo`.
- **Sign Up** (secondary): full-width, height 44px, transparent bg, `1.5px solid #d1d5db` border, `#0a1628` text, Inter 600, border-radius 9px. Routes to `/signup`.

**Security note**
- Green filled circle (18px, `#16a34a`) with a checkmark + text **"Secured with enterprise-grade encryption"**
- Text: Inter 400, 11.5px, `#9ca3af`, centered

---

## Footer (position: absolute, bottom)

Padding `18px 56px`.

- Left: `© 2024 GST Ledger. All rights reserved.` — `rgba(255,255,255,0.28)`, 12px
- Right: Privacy Policy · Terms of Service · Security links — `rgba(255,255,255,0.38)`, 12px

---

## Typography

| Usage | Family | Weight | Size |
|-------|--------|--------|------|
| All text | Inter (Google Fonts) | 400/500/600/700/800/900 | varies |

Load via `next/font/google` in `app/layout.tsx`, replacing the existing local Geist fonts for the login route. Inter is added alongside existing fonts.

---

## Colours

| Token | Hex |
|-------|-----|
| Brand (background) | `#0a1628` |
| Accent (orange) | `#f97316` |
| White | `#ffffff` |
| Card text primary | `#0a1628` |
| Card text muted | `#6b7280` |
| Input border | `#e5e7eb` |
| Input bg | `#f9fafb` |
| Security green | `#16a34a` |

---

## Assets Required

- `/public/login-bg.jpg` — coastal/ocean photograph (min 1200px wide). Must be added before deployment. The right panel `background-image` points to this path.

---

## Existing Auth Logic (preserved as-is)

The `handleSubmit` function in the current `page.tsx` POSTs to `/api/auth` with `{ action: 'login', email, password }` and redirects on success. This logic is kept unchanged; only the JSX and styling change.

The "Forgot Password?" link routes to `/reset` (existing route). "Sign Up" routes to `/signup` (existing route).

---

## Component Structure

All markup lives in `app/(auth)/login/page.tsx` as a single client component (`'use client'`). No new component files needed — the page is self-contained.

The badge pulse `@keyframes` animation is defined in `app/globals.css`.

---

## Out of Scope

- Changes to `/api/auth`, `/reset`, or `/signup` routes
- "Remember User ID" persistence logic (checkbox renders but is not wired to localStorage in this phase)
- "Contact Support", "Help", "Documentation", "Learn more →", "Privacy Policy", "Terms of Service", "Security" nav/footer links (render as `<a href="#">` for now)
