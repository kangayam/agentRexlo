'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const REMEMBER_KEY = 'gst_remembered_email'

function LoginInner() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [remember, setRemember] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setEmailValue(saved)
      setRemember(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData(e.currentTarget)
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: emailValue,
          password: fd.get('password'),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, emailValue)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
      const from = searchParams?.get('from')
      window.location.href = from ?? data.redirectTo
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main
      style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
      className="flex h-screen overflow-hidden bg-[#021C2E] relative"
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

        {/* Headline */}
        <h1
          className="text-white mb-[18px]"
          style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.2px' }}
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
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(230,184,162,0.12)',
                padding: '20px 22px',
                backdropFilter: 'blur(4px)',
              }}
            >
              <div
                style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 6, color: '#E6B8A2' }}
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
      </div>

      {/* ── RIGHT PANEL ── */}
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

        {/* Login card */}
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

          {searchParams?.get('reason') === 'timeout' && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200
                            rounded-lg flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-amber-800">
                You were signed out due to inactivity. Please sign in again.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Email or User ID */}
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
              value={emailValue}
              onChange={e => setEmailValue(e.target.value)}
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

            {/* Password row */}
            <div className="flex justify-between items-center mb-[6px]">
              <label
                htmlFor="password"
                style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}
              >
                Password
              </label>
              <a
                href="/reset"
                style={{ fontSize: 12.5, fontWeight: 600, textDecoration: 'none', color: '#E6B8A2' }}
              >
                Forgot Password?
              </a>
            </div>
            <div className="relative mb-[14px]">
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
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Remember User ID */}
            <div className="flex items-center gap-2 mt-1 mb-[18px]">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
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
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            {/* Login button */}
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

            {/* Security note */}
            <div className="flex items-center justify-center gap-[7px]">
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
          © 2026 GST Ledger. All rights reserved.
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#021C2E]" />}>
      <LoginInner />
    </Suspense>
  )
}
