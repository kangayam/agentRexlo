'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Member = { id: string; name: string; email: string; role: string; created_at: string }
type Invite = { id: string; email: string; role: string; expires_at: string; created_at: string }
type TeamData = { members: Member[]; invites: Invite[]; currentUser: { role: string }; orgName: string }

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/team')
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInviteError('')
    setInviteLoading(true)
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invite', email: inviteEmail, role: 'CA_STAFF' }),
    })
    const result = await res.json()
    if (!res.ok) { setInviteError(result.error); setInviteLoading(false); return }
    setInviteEmail('')
    setInviteLoading(false)
    await load()
  }

  async function handleResend(inviteId: string) {
    setActionLoading(inviteId)
    await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend', inviteId }),
    })
    setActionLoading(null)
  }

  async function handleRevoke(inviteId: string) {
    setActionLoading(inviteId)
    await fetch(`/api/team?inviteId=${inviteId}`, { method: 'DELETE' })
    setActionLoading(null)
    await load()
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this team member? They will lose access immediately.')) return
    setActionLoading(memberId)
    await fetch(`/api/team?memberId=${memberId}`, { method: 'DELETE' })
    setActionLoading(null)
    await load()
  }

  const isAdmin = data?.currentUser.role === 'CA_ADMIN'

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Team — {data?.orgName}</h1>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Invite a team member</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label htmlFor="inviteEmail">Email address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="staff@yourfirm.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? 'Sending…' : 'Send invite'}
              </Button>
            </form>
            {inviteError && <p className="text-sm text-red-600 mt-2">{inviteError}</p>}
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Active members</h2>
        {!data && <p className="text-sm text-slate-400">Loading…</p>}
        {data?.members.length === 0 && <p className="text-sm text-slate-400">No other team members yet.</p>}
        <div className="divide-y border rounded-lg bg-white">
          {data?.members.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email} · {m.role === 'CA_ADMIN' ? 'Admin' : 'Staff'}</p>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleRemove(m.id)}
                  disabled={actionLoading === m.id}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      {(data?.invites.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Pending invites</h2>
          <div className="divide-y border rounded-lg bg-white">
            {data?.invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{inv.email}</p>
                  <p className="text-xs text-slate-500">
                    Invited · expires {new Date(inv.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleResend(inv.id)} disabled={actionLoading === inv.id}>
                      Resend
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleRevoke(inv.id)} disabled={actionLoading === inv.id}>
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
