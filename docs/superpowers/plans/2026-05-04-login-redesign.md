# Login Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal login card at `/login` with a full-viewport split-panel hero page matching the approved GST Ledger design.

**Architecture:** Single client component at `app/(auth)/login/page.tsx` — no new files, no new API routes. Inter font added globally via `next/font/google`. Badge pulse animation lives in `globals.css`. Background photo bundled as a static asset at `public/login-bg.jpg`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `next/font/google` (Inter), inline styles for custom design tokens.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/layout.tsx` | Modify | Add Inter via `next/font/google`, expose as `--font-inter` CSS variable |
| `app/globals.css` | Modify | Add `@keyframes pulse-dot` + `.animate-pulse-dot` utility class |
| `public/login-bg.jpg` | Add | Coastal/ocean background photo for right panel |
| `app/(auth)/login/page.tsx` | Rewrite | Full new JSX — layout, nav, hero, card, footer |

---

## Task 1: Add Inter font to the global layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add Inter import and configuration**

Open `app/layout.tsx`. Add the Inter import alongside the existing local fonts and apply its CSS variable to `<body>`. The full file becomes:

```typescript
import type { Metadata } from "next"
import localFont from "next/font/local"
import { Inter } from "next/font/google"
import "./globals.css"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
})
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "AgentFlow Core",
  description: "AI-powered ITC reconciliation for Chartered Accountants",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify dev server still compiles**

The dev server is already running (`npm run dev`). Check the terminal — it should show no errors. Visit http://localhost:3000 and confirm the app loads.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add Inter font via next/font/google"
```

---

## Task 2: Add badge pulse animation to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append the keyframes and utility class**

Add these lines at the **end** of `app/globals.css` (after the closing `}` of the second `@layer base` block):

```css
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.55; transform: scale(1.35); }
}

.animate-pulse-dot {
  animation: pulse-dot 2s ease-in-out infinite;
}
```

- [ ] **Step 2: Verify no compile errors**

Check the dev server terminal — should be clean. No browser check needed yet.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add pulse-dot keyframe animation"
```

---

## Task 3: Add background photo asset

**Files:**
- Add: `public/login-bg.jpg`

- [ ] **Step 1: Obtain a coastal photo**

Download any high-quality coastal/ocean photo (min 1200px wide) and save it as `public/login-bg.jpg`. A free option: go to [unsplash.com](https://unsplash.com), search "coastal cliff ocean", download the photo, rename it `login-bg.jpg`, and move it into the `public/` folder.

The file must be at exactly `public/login-bg.jpg` — the login page references `/login-bg.jpg` as the background URL.

- [ ] **Step 2: Verify the photo is accessible**

With the dev server running, open http://localhost:3000/login-bg.jpg in a browser. You should see the photo, not a 404.

- [ ] **Step 3: Commit**

```bash
git add public/login-bg.jpg
git commit -m "feat: add login page background photo"
```

---

## Task 4: Rewrite the login page

**Files:**
- Rewrite: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Replace the entire file with the new implementation**

```typescript
'use client'
import { useState } from 'react'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: fd.get('email'),
        password: fd.get('password'),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    window.location.href = data.redirectTo
  }

  return (
    <main
      style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
      className="flex h-screen overflow-hidden bg-[#0a1628] relative"
    >
      {/* ── NAV ── */}
      <nav
        className="absolute top-0 left-0 right-0 flex items-center justify-between z-20"
        style={{ padding: '22px 56px' }}
      >
        <span className="text-white font-bold" style={{ fontSize: 18, letterSpacing: '-0.3px' }}>
          GST Ledger
        </span>
        <div className="flex items-center gap-7">
          <a href="#" className="text-white/75 font-medium" style={{ fontSize: 13.5 }}>Help</a>
          <a href="#" className="text-white/75 font-medium" style={{ fontSize: 13.5 }}>Documentation</a>
          <button
            className="text-white font-medium"
            style={{
              fontSize: 13.5,
              padding: '8px 18px',
              borderRadius: 7,
              border: '1.5px solid rgba(255,255,255,0.35)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Contact Support
          </button>
        </div>
      </nav>

      {/* ── LEFT PANEL ── */}
      <div
        className="flex flex-col relative z-10"
        style={{ width: '54%', padding: '140px 64px 80px' }}
      >
        {/* Badge */}
        <div
          className="flex items-center gap-2 w-fit rounded-full mb-[30px]"
          style={{
            background: 'rgba(249,115,22,0.12)',
            border: '1px solid rgba(249,115,22,0.35)',
            padding: '7px 16px',
          }}
        >
          <div className="animate-pulse-dot w-2 h-2 rounded-full bg-[#f97316]" />
          <span
            className="text-[#f97316] font-bold uppercase"
            style={{ fontSize: 11, letterSpacing: '1.2px' }}
          >
            AI-POWERED PLATFORM
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-white mb-[18px]"
          style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-1.5px' }}
        >
          Discover AI-powered GST reconciliation and client-centric solutions tailored for
          Chartered Accountants in India.
        </h1>

        {/* Subtext */}
        <p
          className="mb-[42px]"
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 15.5,
            fontWeight: 400,
            lineHeight: 1.6,
            maxWidth: 420,
          }}
        >
          GST compliance that used to take 80 hours now takes 25.
        </p>

        {/* Stat Cards */}
        <div className="flex gap-[14px] mb-[44px]">
          {[
            { number: '69%',   label: 'TIME SAVED' },
            { number: '10K+',  label: 'CA FIRMS'   },
            { number: '99.9%', label: 'ACCURACY'   },
          ].map(({ number, label }) => (
            <div
              key={label}
              className="flex-1 rounded-[14px]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                padding: '20px 22px',
                backdropFilter: 'blur(4px)',
              }}
            >
              <div
                className="text-[#f97316]"
                style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}
              >
                {number}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="flex items-center gap-2 text-white w-fit"
          style={{
            background: '#f97316',
            padding: '14px 28px',
            borderRadius: 9,
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '-0.2px',
          }}
        >
          Learn more →
        </button>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex items-center justify-center relative overflow-hidden"
        style={{ width: '46%' }}
      >
        {/* Photo background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/login-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Left-edge gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(10,22,40,0.45) 0%, transparent 50%)' }}
        />

        {/* Login card */}
        <div
          className="relative z-10 bg-white rounded-[20px]"
          style={{
            width: 370,
            padding: '38px 34px 32px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          <h2
            className="text-center text-[#0a1628] mb-[6px]"
            style={{ fontSize: 21, fontWeight: 700 }}
          >
            Welcome Back
          </h2>
          <p
            className="text-center text-[#6b7280] mb-[26px]"
            style={{ fontSize: 12.5, lineHeight: 1.5 }}
          >
            Please enter your credentials to access the ledger.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Email or User ID */}
            <label
              className="text-[#374151] mb-[6px]"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Email or User ID
            </label>
            <input
              name="email"
              type="text"
              placeholder="name@company.com"
              required
              className="mb-[14px] outline-none"
              style={{
                height: 42,
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                padding: '0 12px',
                fontSize: 14,
                color: '#374151',
                background: '#f9fafb',
                fontFamily: 'inherit',
              }}
            />

            {/* Password row */}
            <div className="flex justify-between items-center mb-[6px]">
              <label
                className="text-[#374151]"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                Password
              </label>
              <a
                href="/reset"
                className="text-[#f97316]"
                style={{ fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}
              >
                Forgot Password?
              </a>
            </div>
            <div className="relative mb-[14px]">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                className="w-full outline-none"
                style={{
                  height: 42,
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '0 40px 0 12px',
                  fontSize: 14,
                  color: '#374151',
                  background: '#f9fafb',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#9ca3af]"
                style={{ fontSize: 15 }}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>

            {/* Remember User ID */}
            <div className="flex items-center gap-2 mt-1 mb-[18px]">
              <input
                type="checkbox"
                id="remember"
                className="cursor-pointer"
                style={{ width: 15, height: 15, accentColor: '#0a1628' }}
              />
              <label
                htmlFor="remember"
                className="text-[#6b7280] cursor-pointer"
                style={{ fontSize: 13 }}
              >
                Remember User ID
              </label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white mb-[11px] flex items-center justify-center gap-2"
              style={{
                height: 44,
                background: '#0a1628',
                border: 'none',
                borderRadius: 9,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Logging in…
                </>
              ) : (
                'Login'
              )}
            </button>

            {/* Sign Up button */}
            <a
              href="/signup"
              className="w-full flex items-center justify-center text-[#0a1628] mb-[20px]"
              style={{
                height: 44,
                border: '1.5px solid #d1d5db',
                borderRadius: 9,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: 'inherit',
              }}
            >
              Sign Up
            </a>

            {/* Security note */}
            <div className="flex items-center justify-center gap-[7px]">
              <div
                className="flex items-center justify-center text-white rounded-full flex-shrink-0"
                style={{ width: 18, height: 18, background: '#16a34a', fontSize: 10 }}
              >
                ✓
              </div>
              <span className="text-[#9ca3af]" style={{ fontSize: 11.5 }}>
                Secured with enterprise-grade encryption
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer
        className="absolute bottom-0 left-0 right-0 flex justify-between items-center z-20"
        style={{ padding: '18px 56px' }}
      >
        <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>
          © 2024 GST Ledger. All rights reserved.
        </span>
        <div className="flex gap-[22px]">
          {['Privacy Policy', 'Terms of Service', 'Security'].map(link => (
            <a
              key={link}
              href="#"
              style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, textDecoration: 'none' }}
            >
              {link}
            </a>
          ))}
        </div>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see "Cannot find module 'next/font/google'" ensure Task 1 is complete and `npm install` has been run.

- [ ] **Step 3: Visually verify in the browser**

Open http://localhost:3000/login. Check:
- Dark navy full-viewport background with no scroll
- "GST Ledger" logo top-left, Help / Documentation / Contact Support top-right
- Orange pulsing badge, large white headline, muted subtext
- Three glassmorphism stat cards (69%, 10K+, 99.9%) with orange numbers
- Orange "Learn more →" button
- Right panel shows the coastal photo (or a broken image icon if Task 3 is not done yet — that's fine for now)
- White login card centered on the right with all fields, login/signup buttons, security note
- Footer copyright left, links right

- [ ] **Step 4: Test the login form still works**

Try logging in with valid credentials. Confirm:
- Loading spinner appears while the request is in flight
- On success: redirected to the expected dashboard route
- On failure: red error message appears below the Remember User ID checkbox

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat: redesign login page as full-viewport hero layout"
```

---

## Task 5: Final visual check with photo

**Files:** none (verification only)

- [ ] **Step 1: Confirm photo loads**

Ensure `public/login-bg.jpg` exists (Task 3). Open http://localhost:3000/login. The right panel should show the coastal photo. If it's missing, complete Task 3.

- [ ] **Step 2: Check responsive behaviour at common breakpoints**

Resize the browser to 1280px and 1440px wide. The layout should remain usable — card stays visible, headline does not overflow. (Mobile breakpoints are out of scope for this phase.)

- [ ] **Step 3: Final commit if any tweaks were needed**

```bash
git add -p   # stage only intentional changes
git commit -m "fix: login page photo and layout tweaks"
```
