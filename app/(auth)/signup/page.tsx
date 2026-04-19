'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function SignupPage() {
  const [step, setStep] = useState<'form' | 'check-email'>('form')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const enteredEmail = fd.get('email') as string

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        email: enteredEmail,
        password: fd.get('password'),
        name: fd.get('name'),
        orgName: fd.get('orgName'),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setEmail(enteredEmail)
    setStep('check-email')
    setLoading(false)
  }

  if (step === 'check-email') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Didn&apos;t receive it? Check your spam folder, or{' '}
              <button onClick={() => setStep('form')} className="underline text-slate-900">
                try again
              </button>
              .
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your CA firm account</CardTitle>
          <CardDescription>Sign up to start managing ITC reconciliation for your clients.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" placeholder="Rajesh Sharma" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="orgName">CA firm name</Label>
              <Input id="orgName" name="orgName" placeholder="Sharma & Associates" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" placeholder="rajesh@sharma-ca.com" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <a href="/login" className="text-slate-900 underline">Log in</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
