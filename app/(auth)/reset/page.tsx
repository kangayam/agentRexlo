'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function ResetPage() {
  const [mode, setMode] = useState<'request' | 'confirm'>('request')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'confirm') setMode('confirm')
  }, [])

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-request', email: fd.get('email') }),
    })
    setSent(true)
    setLoading(false)
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-confirm', password: fd.get('password') }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    window.location.href = data.redirectTo
  }

  if (mode === 'confirm') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Set new password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="password">New password</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-slate-600">
              If an account exists for that email, you&apos;ll receive a reset link within a few minutes.
            </p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </main>
  )
}
