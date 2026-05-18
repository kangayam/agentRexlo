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
