'use client'
import { useState } from 'react'
import { useFadeIn } from '@/hooks/useFadeIn'

const trustBadges = ['30-day free pilot', 'No credit card', 'Cancel anytime']

export function FinalCTA() {
  const ref = useFadeIn()
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
    <section id="cta"
             className="py-24 px-6"
             style={{ background: 'linear-gradient(135deg, #00bfad 0%, #0284c7 50%, #6366f1 100%)' }}>
      <div ref={ref} className="max-w-2xl mx-auto text-center">

        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
          Ready to Recover Every Rupee?
        </h2>
        <p className="text-base text-white/80 mb-10 leading-relaxed">
          Every quarter you wait, 2–5% of your clients&apos; eligible ITC stays on the table.
          Our AI agents work 24/7 so your team doesn&apos;t have to.
        </p>

        {/* Form */}
        {submitted ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-5 mb-6">
            <p className="text-white font-semibold text-base">
              🎉 Thanks! We&apos;ll be in touch within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 h-12 px-4 rounded-xl bg-white/10 backdrop-blur-sm
                         border border-white/20 text-white placeholder:text-white/50
                         focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 px-6 rounded-xl bg-[#0f1629] text-white font-bold text-sm
                         hover:bg-[#1e2d4d] transition-colors whitespace-nowrap
                         disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Sending…' : 'Book a Free Call'}
            </button>
          </form>
          {error && (
            <p className="text-white/80 text-xs mb-3">{error}</p>
          )}
        )}

        <p className="text-xs text-white/60 mb-6">
          Or email us directly:{' '}
          <a href="mailto:partners@agentgst.in"
             className="underline hover:text-white transition-colors">
            partners@agentgst.in
          </a>
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4">
          {trustBadges.map(b => (
            <span key={b}
                  className="flex items-center gap-2 text-xs font-semibold text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
              {b}
            </span>
          ))}
        </div>

      </div>
    </section>
  )
}
