'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

// Password rules
const RULES = [
  { label: 'At least 8 characters',        test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',    test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)',    test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number (0–9)',              test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character (!@#…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const passed = RULES.filter(r => r.test(password)).length
  const color = passed <= 2 ? 'bg-red-500' : passed <= 3 ? 'bg-amber-400' : passed === 4 ? 'bg-blue-400' : 'bg-green-500'
  const label = passed <= 2 ? 'Weak' : passed <= 3 ? 'Fair' : passed === 4 ? 'Good' : 'Strong'
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${(passed / 5) * 100}%` }} />
        </div>
        <span className="text-xs text-slate-500 w-10">{label}</span>
      </div>
      <ul className="space-y-0.5">
        {RULES.map(r => (
          <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
            <span>{r.test(password) ? '✓' : '○'}</span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ResetPage() {
  const [mode, setMode]                   = useState<'request' | 'confirm'>('request')
  const [sent, setSent]                   = useState(false)
  const [done, setDone]                   = useState(false)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'confirm') setMode('confirm')
  }, [])

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset`,
    })
    setSubmittedEmail(email)
    setSent(true)
    setLoading(false)
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const allPassed = RULES.every(r => r.test(password))
    if (!allPassed) { setError('Password does not meet all requirements.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-confirm', password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setDone(true)
    setTimeout(() => { window.location.href = data.redirectTo }, 2500)
  }

  // ── Confirm mode: password changed success ────────────────────────────────
  if (mode === 'confirm' && done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password updated</CardTitle>
            <CardDescription>Your password has been changed successfully.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Redirecting you to login…</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── Confirm mode: set new password form ───────────────────────────────────
  if (mode === 'confirm') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Set new password</CardTitle>
            <CardDescription>Choose a strong password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <PasswordStrength password={password} />
              <div className="space-y-1">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving…' : 'Set new password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── Request mode: email sent success ─────────────────────────────────────
  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>We sent a reset link to <strong>{submittedEmail}</strong>.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Click the link in the email to set a new password. If you don&apos;t see it, check your spam folder.
            </p>
            <p className="text-center text-sm">
              <a href="/login" className="text-slate-500 underline">Back to login</a>
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── Request mode: email input form ────────────────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
            <p className="text-center text-sm">
              <a href="/login" className="text-slate-500 underline">Back to login</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
