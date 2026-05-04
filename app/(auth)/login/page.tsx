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
