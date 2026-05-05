'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReconciliationTab } from '@/components/dashboard/client-detail/ReconciliationTab'
import { AnalyticsTab } from '@/components/dashboard/client-detail/AnalyticsTab'
import { TrendTab } from '@/components/dashboard/client-detail/TrendTab'

type Tab = 'reconciliation' | 'analytics' | 'trend'

interface ClientDetail {
  firmName:     string
  contactEmail: string
  gstins:       Array<{ id: string; gstin: string; is_primary: boolean }>
  users:        Array<{ id: string; name: string; email: string; created_at: string }>
  invite:       { email: string; expires_at: string } | null
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function ClientDetailInner() {
  const router       = useRouter()
  const { clientId } = useParams<{ clientId: string }>()
  const searchParams = useSearchParams()

  const tabParam    = (searchParams.get('tab') as Tab | null) ?? 'analytics'
  const periodParam = searchParams.get('period')

  const [client,       setClient]       = useState<ClientDetail | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState<Tab>(tabParam)
  const [period,       setPeriod]       = useState<string | null>(periodParam)
  const [periods,      setPeriods]      = useState<string[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [infoOpen,     setInfoOpen]     = useState(false)
  const [newGstin,     setNewGstin]     = useState('')
  const [addingGstin,  setAddingGstin]  = useState(false)
  const [gstinError,   setGstinError]   = useState('')
  const [actingAs,     setActingAs]     = useState(false)
  const [resending,    setResending]    = useState(false)
  const [resendError,  setResendError]  = useState('')

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setClient(data)
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetchClient() }, [fetchClient])

  // Stable callbacks passed to ReconciliationTab — must not change on every render
  const handlePeriods = useCallback((p: string[]) => {
    setPeriods(p)
    setPeriod(prev => (prev === null && p.length > 0) ? p[0] : prev)
  }, [])

  function navigate(tab: Tab, p?: string | null) {
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (p) params.set('period', p)
    router.replace(`/ca/clients/${clientId}?${params.toString()}`)
    setActiveTab(tab)
    if (p !== undefined) setPeriod(p)
  }

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
      if (!res.ok) { setGstinError(data.error ?? 'Failed'); return }
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
      if (res.ok) router.push('/client/upload')
    } catch {
      // network failure
    } finally {
      setActingAs(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>
  if (!client) return <div className="p-8 text-red-600 text-sm">Client not found.</div>

  const fmtPeriod = (p: string) => {
    const [yyyy, mm] = p.split('-')
    return new Date(Number(yyyy), Number(mm) - 1, 1)
      .toLocaleString('en-IN', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-400">
        <a href="/ca/dashboard" className="hover:text-slate-600 transition-colors">Dashboard</a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 font-medium">{client.firmName}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{client.firmName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{client.contactEmail}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector — populated by ReconciliationTab */}
          {periods.length > 0 && (
            <select
              value={period ?? ''}
              onChange={e => navigate(activeTab, e.target.value || null)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {periods.map(p => (
                <option key={p} value={p}>{fmtPeriod(p)}</option>
              ))}
            </select>
          )}

          <Button variant="outline" size="sm" className="text-xs" disabled>
            Export PDF
          </Button>

          {pendingCount > 0 && (
            <Button size="sm" className="text-xs bg-red-600 hover:bg-red-700 text-white border-0">
              Send Reminders ({pendingCount})
            </Button>
          )}

          <Button onClick={handleActAs} disabled={actingAs} variant="outline" size="sm" className="text-xs">
            {actingAs ? 'Switching…' : 'Act as Client'}
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-0">
          {([
            { key: 'analytics',      label: 'Analytics',      badge: '4 insights',                           badgeClass: 'bg-blue-100 text-blue-700' },
            { key: 'reconciliation', label: 'Reconciliation',  badge: pendingCount > 0 ? String(pendingCount) : null, badgeClass: 'bg-amber-100 text-amber-700' },
            { key: 'trend',          label: 'Trend',           badge: null,                                   badgeClass: '' },
          ] as const).map(({ key, label, badge, badgeClass }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              {label}
              {badge && (
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${badgeClass}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'reconciliation' && (
          <ReconciliationTab
            clientId={clientId}
            period={period}
            onPendingCount={setPendingCount}
            onPeriods={handlePeriods}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab clientId={clientId} period={period} />
        )}
        {activeTab === 'trend' && (
          <TrendTab clientId={clientId} />
        )}
      </div>

      {/* ── Client Info (collapsed) ───────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setInfoOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="text-sm font-medium text-slate-700">Client Info &amp; Settings</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${infoOpen ? 'rotate-180' : ''}`} />
        </button>

        {infoOpen && (
          <div className="divide-y divide-slate-100 bg-white">
            {/* GSTINs */}
            <div className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">GSTINs</h3>
              <ul className="space-y-1">
                {client.gstins.map(g => (
                  <li key={g.id} className="flex items-center gap-2 font-mono text-sm text-slate-700">
                    {g.gstin}
                    {g.is_primary && (
                      <span className="text-[11px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <form onSubmit={handleAddGstin} className="flex gap-2">
                <Input
                  value={newGstin}
                  onChange={e => setNewGstin(e.target.value.toUpperCase())}
                  placeholder="Add GSTIN"
                  maxLength={15}
                  className="w-52 text-sm"
                />
                <Button type="submit" variant="outline" size="sm" disabled={addingGstin}>
                  {addingGstin ? 'Adding…' : 'Add'}
                </Button>
              </form>
              {gstinError && <p className="text-xs text-red-600">{gstinError}</p>}
            </div>

            {/* Active Users */}
            <div className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Users</h3>
              {client.users.length === 0 ? (
                <p className="text-sm text-slate-400">No users yet — invite pending.</p>
              ) : (
                <ul className="space-y-2">
                  {client.users.map(u => (
                    <li key={u.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{u.name}</span>
                      <span className="text-slate-500">{u.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Invite */}
            {client.users.length === 0 && (
              <div className="p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client Invite</h3>
                {client.invite ? (
                  <p className="text-sm text-slate-600">
                    Invite sent to <strong>{client.invite.email}</strong> — expires{' '}
                    {new Date(client.invite.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600">
                    No active invite. Send one to <strong>{client.contactEmail}</strong>.
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={handleResendInvite} disabled={resending}>
                  {resending ? 'Sending…' : client.invite ? 'Resend Invite' : 'Send Invite'}
                </Button>
                {resendError && <p className="text-xs text-red-600">{resendError}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page export (Suspense boundary for useSearchParams) ──────────────────────

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading…</div>}>
      <ClientDetailInner />
    </Suspense>
  )
}
