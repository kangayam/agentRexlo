'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ClientDetail {
  firmName: string
  contactEmail: string
  gstins: Array<{ id: string; gstin: string; is_primary: boolean }>
  users: Array<{ id: string; name: string; email: string; created_at: string }>
  invite: { email: string; expires_at: string } | null
}

export default function ClientDetailPage() {
  const router = useRouter()
  const { clientId } = useParams<{ clientId: string }>()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newGstin, setNewGstin] = useState('')
  const [addingGstin, setAddingGstin] = useState(false)
  const [gstinError, setGstinError] = useState('')
  const [actingAs, setActingAs] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState('')

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setClient(data)
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetchClient() }, [fetchClient])

  const handleAddGstin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingGstin(true)
    setGstinError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-gstin', clientId, gstin: newGstin.toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGstinError(data.error ?? 'Failed')
        return
      }
      setNewGstin('')
      fetchClient()
    } catch {
      setGstinError('Network error — please try again')
    } finally {
      setAddingGstin(false)
    }
  }

  const handleResendInvite = async () => {
    setResending(true)
    setResendError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend-invite', clientId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setResendError(data.error ?? 'Failed to send invite')
      }
    } catch {
      setResendError('Network error — please try again')
    } finally {
      setResending(false)
    }
  }

  const handleActAs = async () => {
    setActingAs(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/acting-as`, { method: 'POST' })
      if (res.ok) {
        router.push('/client/upload')
      }
    } catch {
      // network failure
    } finally {
      setActingAs(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>
  if (!client) return <div className="p-8 text-red-600">Client not found.</div>

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.firmName}</h1>
          <p className="text-gray-500 text-sm mt-1">{client.contactEmail}</p>
        </div>
        <Button onClick={handleActAs} disabled={actingAs} variant="outline">
          {actingAs ? 'Switching…' : 'Act as Client'}
        </Button>
      </div>

      {/* GSTINs */}
      <section className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-gray-800">GSTINs</h2>
        <ul className="space-y-1">
          {client.gstins.map(g => (
            <li key={g.id} className="flex items-center gap-2 font-mono text-sm text-gray-700">
              {g.gstin}
              {g.is_primary && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Primary</span>}
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddGstin} className="flex gap-2 pt-2">
          <Input
            value={newGstin}
            onChange={e => setNewGstin(e.target.value.toUpperCase())}
            placeholder="Add GSTIN"
            maxLength={15}
            className="w-52"
          />
          <Button type="submit" variant="outline" size="sm" disabled={addingGstin}>
            {addingGstin ? 'Adding…' : 'Add'}
          </Button>
        </form>
        {gstinError && <p className="text-sm text-red-600">{gstinError}</p>}
      </section>

      {/* Active Users */}
      <section className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-gray-800">Active Users</h2>
        {client.users.length === 0 ? (
          <p className="text-gray-500 text-sm">No users yet — invite pending.</p>
        ) : (
          <ul className="space-y-2">
            {client.users.map(u => (
              <li key={u.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800">{u.name}</span>
                <span className="text-gray-500">{u.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invite */}
      {client.invite && (
        <section className="bg-white border rounded-xl p-6 space-y-3 shadow-sm">
          <h2 className="font-semibold text-gray-800">Pending Invite</h2>
          <p className="text-sm text-gray-600">
            Sent to <strong>{client.invite.email}</strong> — expires{' '}
            {new Date(client.invite.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          <Button variant="outline" size="sm" onClick={handleResendInvite} disabled={resending}>
            {resending ? 'Sending…' : 'Resend Invite'}
          </Button>
          {resendError && <p className="text-sm text-red-600">{resendError}</p>}
        </section>
      )}
    </div>
  )
}
