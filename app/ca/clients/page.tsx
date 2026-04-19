'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ClientRow {
  id: string
  firmName: string
  primaryGstin: string
  status: 'active' | 'invited' | 'pending'
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  invited: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-600',
}

export default function CAClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [firmName, setFirmName] = useState('')
  const [gstin, setGstin] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [fetchError, setFetchError] = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) throw new Error('Failed to load clients')
      const data = await res.json()
      setClients(data.clients ?? [])
    } catch {
      setFetchError('Failed to load clients. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', firmName, primaryGstin: gstin.toUpperCase(), contactEmail: email }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Failed'); return }
      setShowForm(false)
      setFirmName(''); setGstin(''); setEmail('')
      fetchClients()
    } catch {
      setFormError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading clients…</div>
  if (fetchError) return <div className="p-8 text-red-600">{fetchError}</div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Button onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Add Client'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddClient} className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-800">Add new client</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firmName">Firm name</Label>
              <Input id="firmName" value={firmName} onChange={e => setFirmName(e.target.value)} required placeholder="ABC Enterprises" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gstin">Primary GSTIN</Label>
              <Input id="gstin" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} required maxLength={15} placeholder="27AABCU9603R1ZX" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="owner@firm.com" />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Client & Send Invite'}
          </Button>
        </form>
      )}

      {!showForm && clients.length === 0 ? (
        <p className="text-gray-500">No clients yet. Add your first client above.</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Firm Name</th>
                <th className="text-left p-4 font-medium text-gray-600">Primary GSTIN</th>
                <th className="text-left p-4 font-medium text-gray-600">Status</th>
                <th className="text-left p-4 font-medium text-gray-600">Added</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{c.firmName}</td>
                  <td className="p-4 font-mono text-gray-700">{c.primaryGstin}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/ca/clients/${c.id}`} className="text-indigo-600 hover:underline text-sm font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
