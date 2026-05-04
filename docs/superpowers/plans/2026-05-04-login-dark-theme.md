# Login Dark Theme Retheme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap every orange/light color token in `app/(auth)/login/page.tsx` to the approved dark-peach palette (#021C2E background, #0A2F4A secondary panel, #E6B8A2 muted peach accent).

**Architecture:** Single-file cosmetic replacement — no new components, no routing, no API changes. All logic (handleSubmit, error state, loading spinner, eye toggle) remains identical. The right panel's photo-background divs are replaced with a solid color + a radial-gradient overlay div.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS (arbitrary values), inline React styles.

---

## File map

| File | Action |
|---|---|
| `app/(auth)/login/page.tsx` | Modify — replace all color tokens; replace right panel background implementation |

No new files. `app/globals.css` is untouched — `animate-pulse-dot` keyframe already exists with the correct opacity/scale values.

---

### Task 1: Replace page shell and nav colors

**Files:**
- Modify: `app/(auth)/login/page.tsx` (lines 36–64)

No automated test exists for visual color changes. Verify visually by running the dev server and loading `/login`.

- [ ] **Step 1: Update page background and nav Contact Support button**

In `app/(auth)/login/page.tsx`, make the following changes:

Line 36 — change page background class:
```tsx
// OLD
className="flex h-screen overflow-hidden bg-[#0a1628] relative"
// NEW
className="flex h-screen overflow-hidden bg-[#021C2E] relative"
```

Lines 49–63 — update Contact Support button (border + text color):
```tsx
// OLD
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

// NEW
<button
  style={{
    fontSize: 13.5,
    padding: '8px 18px',
    borderRadius: 7,
    border: '1.5px solid rgba(230,184,162,0.35)',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#E6B8A2',
    fontWeight: 500,
  }}
>
  Contact Support
</button>
```

- [ ] **Step 2: Start dev server and confirm page loads at `/login`**

```bash
npm run dev
```

Open http://localhost:3000/login — page should show dark navy background. Nav "Contact Support" button should have a peach-tinted border (not pure white). No other changes visible yet.

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "style: update page bg and nav contact button to dark-peach palette"
```

---

### Task 2: Update left panel — badge, headline, stat cards, CTA button

**Files:**
- Modify: `app/(auth)/login/page.tsx` (lines 71–167)

- [ ] **Step 1: Update badge colors**

Lines 73–87 — change badge background, border, dot color, and text color:
```tsx
// OLD
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

// NEW
<div
  className="flex items-center gap-2 w-fit rounded-full mb-[30px]"
  style={{
    background: 'rgba(230,184,162,0.10)',
    border: '1px solid rgba(230,184,162,0.28)',
    padding: '7px 16px',
  }}
>
  <div className="animate-pulse-dot w-2 h-2 rounded-full" style={{ background: '#E6B8A2' }} />
  <span
    className="font-bold uppercase"
    style={{ fontSize: 11, letterSpacing: '1.2px', color: '#E6B8A2' }}
  >
    AI-POWERED PLATFORM
  </span>
</div>
```

- [ ] **Step 2: Update headline font size**

Lines 90–96 — change fontSize from 44 to 36 and letterSpacing:
```tsx
// OLD
<h1
  className="text-white mb-[18px]"
  style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-1.5px' }}
>

// NEW
<h1
  className="text-white mb-[18px]"
  style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.2px' }}
>
```

- [ ] **Step 3: Update stat card border and number color**

Lines 119–147 — change stat card border and number color:
```tsx
// OLD
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

// NEW
<div
  key={label}
  className="flex-1 rounded-[14px]"
  style={{
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(230,184,162,0.12)',
    padding: '20px 22px',
    backdropFilter: 'blur(4px)',
  }}
>
  <div
    style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 6, color: '#E6B8A2' }}
  >
```

- [ ] **Step 4: Update CTA button (orange → peach bg, white → dark text)**

Lines 151–166:
```tsx
// OLD
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

// NEW
<button
  className="flex items-center gap-2 w-fit"
  style={{
    background: '#E6B8A2',
    color: '#021C2E',
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
```

- [ ] **Step 5: Verify in browser**

Reload http://localhost:3000/login. Confirm:
- Badge pill has peach tint (not orange)
- Headline is visibly smaller (36px vs 44px)
- Stat numbers (69%, 10K+, 99.9%) are peach, not orange
- "Learn more →" button is peach with dark text, not orange with white text

- [ ] **Step 6: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "style: update left panel badge, headline size, stats and CTA to peach palette"
```

---

### Task 3: Replace right panel background and darken login card

**Files:**
- Modify: `app/(auth)/login/page.tsx` (lines 169–210)

- [ ] **Step 1: Replace right panel photo background with solid + gradient**

Lines 169–210 — replace the two absolute background divs (photo + overlay) with a single radial-gradient div:
```tsx
// OLD
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

// NEW
<div
  className="flex items-center justify-center relative overflow-hidden"
  style={{ width: '46%', background: '#0A2F4A' }}
>
  {/* Subtle radial glow */}
  <div
    className="absolute inset-0"
    style={{
      background: 'radial-gradient(ellipse at 70% 40%, rgba(230,184,162,0.06) 0%, transparent 60%)',
    }}
  />
```

- [ ] **Step 2: Update login card — dark background, peach border, dark text**

Lines 190–209 — change card background from white to dark, update title and subtitle colors:
```tsx
// OLD
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

// NEW
<div
  className="relative z-10 rounded-[20px]"
  style={{
    width: 370,
    padding: '38px 34px 32px',
    background: '#021C2E',
    border: '1px solid rgba(230,184,162,0.18)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
  }}
>
  <h2
    className="text-center text-white mb-[6px]"
    style={{ fontSize: 21, fontWeight: 700 }}
  >
    Welcome Back
  </h2>
  <p
    className="text-center mb-[26px]"
    style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.4)' }}
  >
    Please enter your credentials to access the ledger.
  </p>
```

- [ ] **Step 3: Verify in browser**

Reload http://localhost:3000/login. Confirm:
- Right panel is solid dark blue (#0A2F4A), no photo
- Login card is dark (#021C2E) with a subtle peach border — no longer white
- "Welcome Back" is white text
- Subtitle text is dim white (not gray)

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "style: dark right panel and dark login card with peach border"
```

---

### Task 4: Update all form fields, buttons, and security note

**Files:**
- Modify: `app/(auth)/login/page.tsx` (lines 211–379)

- [ ] **Step 1: Update email field (label, input bg/border/text/focus)**

Lines 212–237:
```tsx
// OLD
<label
  htmlFor="email"
  className="text-[#374151] mb-[6px]"
  style={{ fontSize: 13, fontWeight: 600 }}
>
  Email or User ID
</label>
<input
  id="email"
  name="email"
  type="text"
  placeholder="name@company.com"
  required
  className="mb-[14px] outline-none focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent"
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

// NEW
<label
  htmlFor="email"
  className="mb-[6px]"
  style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}
>
  Email or User ID
</label>
<input
  id="email"
  name="email"
  type="text"
  placeholder="name@company.com"
  required
  className="mb-[14px] outline-none focus:outline-none focus:ring-2 focus:ring-[#E6B8A2] focus:border-transparent placeholder:text-white/25"
  style={{
    height: 42,
    border: '1.5px solid rgba(230,184,162,0.2)',
    borderRadius: 8,
    padding: '0 12px',
    fontSize: 14,
    color: '#ffffff',
    background: 'rgba(255,255,255,0.05)',
    fontFamily: 'inherit',
  }}
/>
```

- [ ] **Step 2: Update password label, Forgot Password link, password input, and eye toggle**

Lines 240–295:
```tsx
// OLD — password label
<label
  htmlFor="password"
  className="text-[#374151]"
  style={{ fontSize: 13, fontWeight: 600 }}
>
  Password
</label>
// OLD — forgot password
<a
  href="/reset"
  className="text-[#f97316]"
  style={{ fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}
>
  Forgot Password?
</a>
// OLD — password input
<input
  id="password"
  name="password"
  type={showPassword ? 'text' : 'password'}
  autoComplete="current-password"
  placeholder="••••••••"
  required
  className="w-full outline-none focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent"
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
// OLD — eye button class
className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#9ca3af]"

// NEW — password label
<label
  htmlFor="password"
  style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}
>
  Password
</label>
// NEW — forgot password
<a
  href="/reset"
  style={{ fontSize: 12.5, fontWeight: 600, textDecoration: 'none', color: '#E6B8A2' }}
>
  Forgot Password?
</a>
// NEW — password input
<input
  id="password"
  name="password"
  type={showPassword ? 'text' : 'password'}
  autoComplete="current-password"
  placeholder="••••••••"
  required
  className="w-full outline-none focus:outline-none focus:ring-2 focus:ring-[#E6B8A2] focus:border-transparent placeholder:text-white/25"
  style={{
    height: 42,
    border: '1.5px solid rgba(230,184,162,0.2)',
    borderRadius: 8,
    padding: '0 40px 0 12px',
    fontSize: 14,
    color: '#ffffff',
    background: 'rgba(255,255,255,0.05)',
    fontFamily: 'inherit',
  }}
/>
// NEW — eye button (remove text-[#9ca3af] class, add inline color)
className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer"
style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}
```

- [ ] **Step 3: Update remember checkbox and label**

Lines 299–313:
```tsx
// OLD
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

// NEW
<input
  type="checkbox"
  id="remember"
  className="cursor-pointer"
  style={{ width: 15, height: 15, accentColor: '#E6B8A2' }}
/>
<label
  htmlFor="remember"
  className="cursor-pointer"
  style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}
>
  Remember User ID
</label>
```

- [ ] **Step 4: Update Login button (dark bg/white text → peach bg/dark text)**

Lines 321–348:
```tsx
// OLD
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

// NEW
<button
  type="submit"
  disabled={loading}
  className="w-full mb-[11px] flex items-center justify-center gap-2"
  style={{
    height: 44,
    background: '#E6B8A2',
    color: '#021C2E',
    border: 'none',
    borderRadius: 9,
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    fontFamily: 'inherit',
  }}
>
```

- [ ] **Step 5: Update Sign Up link (dark text/gray border → peach text/peach border)**

Lines 351–365:
```tsx
// OLD
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

// NEW
<a
  href="/signup"
  className="w-full flex items-center justify-center mb-[20px]"
  style={{
    height: 44,
    border: '1.5px solid rgba(230,184,162,0.35)',
    borderRadius: 9,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
    fontFamily: 'inherit',
    color: '#E6B8A2',
  }}
>
  Sign Up
</a>
```

- [ ] **Step 6: Update security note shield and text**

Lines 368–378:
```tsx
// OLD
<div
  className="flex items-center justify-center text-white rounded-full flex-shrink-0"
  style={{ width: 18, height: 18, background: '#16a34a', fontSize: 10 }}
>
  ✓
</div>
<span className="text-[#9ca3af]" style={{ fontSize: 11.5 }}>
  Secured with enterprise-grade encryption
</span>

// NEW
<div
  className="flex items-center justify-center rounded-full flex-shrink-0"
  style={{
    width: 18,
    height: 18,
    background: 'rgba(230,184,162,0.15)',
    border: '1px solid rgba(230,184,162,0.3)',
    color: '#E6B8A2',
    fontSize: 9,
  }}
>
  ✓
</div>
<span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)' }}>
  Secured with enterprise-grade encryption
</span>
```

- [ ] **Step 7: Verify full form in browser**

Reload http://localhost:3000/login. Confirm:
- Email and password inputs have dark translucent background, peach border, white text, white placeholder
- Field labels are dim white (not dark gray)
- "Forgot Password?" link is peach
- Clicking an input shows a peach focus ring (not orange)
- "Login" button is peach background with dark navy text
- "Sign Up" link has a peach outline and peach text
- Checkbox accent color is peach when checked
- Security shield is peach-tinted circle (not green solid)
- Security note text is very dim white
- Submit the form with wrong credentials — error message should still appear in red
- Eye toggle should toggle password visibility, icon color is dim white

- [ ] **Step 8: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "style: update all form fields, buttons and security note to dark-peach palette"
```

---

## Final verification checklist

After all 4 tasks are complete, do a final pass on `/login`:

- [ ] No orange (`#f97316`) anywhere on the page
- [ ] No white card — login card is dark navy with peach border
- [ ] All interactive elements (inputs, buttons, checkbox) use `#E6B8A2` as the accent
- [ ] Headline is visibly smaller than before (36px)
- [ ] Logging in with valid credentials still redirects correctly
- [ ] Logging in with invalid credentials still shows the error inline
