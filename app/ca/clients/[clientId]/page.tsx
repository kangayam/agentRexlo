'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ChevronRight, ChevronDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReconciliationTab } from '@/components/dashboard/client-detail/ReconciliationTab'
import { AnalyticsTab } from '@/components/dashboard/client-detail/AnalyticsTab'
import { TrendTab } from '@/components/dashboard/client-detail/TrendTab'

type Tab = 'reconciliation' | 'analytics' | 'trend'

interface ClientDetail {
  firmName:        string
  contactEmail:    string
  archivedAt:      string | null
  currentUserRole: string
  gstins:          Array<{ id: string; gstin: string; is_primary: boolean }>
  users:           Array<{ id: string; name: string; email: string; created_at: string }>
  invite:          { email: string; expires_at: string } | null
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
  const [actingAs,         setActingAs]         = useState(false)
  const [resending,        setResending]        = useState(false)
  const [resendError,      setResendError]      = useState('')
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [archiveConfirm,   setArchiveConfirm]   = useState('')
  const [archiving,        setArchiving]        = useState(false)

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

  const handleArchiveFromDetail = async () => {
    setArchiving(true)
    try {
      const res = await fetch(`/api/ca/clients/${clientId}/archive`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Archive failed')
        return
      }
      setArchiveModalOpen(false)
      setArchiveConfirm('')
      router.push('/ca/clients')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setArchiving(false)
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

          <button
            onClick={() => window.print()}
            className="h-9 px-4 rounded-lg bg-white border border-slate-200
                       text-slate-700 text-sm font-medium hover:border-slate-300
                       hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>

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

      {/* Tab content — all tabs stay mounted so switching is instant and data isn't re-fetched */}
      <div>
        <div className={activeTab === 'reconciliation' ? '' : 'hidden'}>
          <ReconciliationTab
            clientId={clientId}
            period={period}
            onPendingCount={setPendingCount}
            onPeriods={handlePeriods}
          />
        </div>
        <div className={activeTab === 'analytics' ? '' : 'hidden'}>
          <AnalyticsTab clientId={clientId} period={period} />
        </div>
        <div className={activeTab === 'trend' ? '' : 'hidden'}>
          <TrendTab clientId={clientId} />
        </div>
      </div>

      {/* ── Danger Zone — admin only ─────────────────────────────────────────── */}
      {client.currentUserRole === 'CA_ADMIN' && !client.archivedAt && (
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-red-100 bg-red-50/50">
            <span className="text-sm font-bold text-red-700">Danger Zone</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-amber-50 text-amber-600 border border-amber-200">
              Admin only
            </span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-6 bg-white">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Archive this client</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Revokes portal access immediately. All reconciliation data is retained for
                30 days and can be restored by any Admin. After 30 days, everything is
                permanently deleted.
              </p>
            </div>
            <button
              onClick={() => setArchiveModalOpen(true)}
              className="flex-shrink-0 h-9 px-4 rounded-lg border border-red-200
                         bg-red-50 text-red-700 text-sm font-semibold
                         hover:bg-red-100 transition-colors"
            >
              Archive Client
            </button>
          </div>
        </div>
      )}

      {/* ── Client Info (collapsed) — only on Reconciliation tab ─────────────── */}
      {activeTab === 'reconciliation' && (
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
      )}
      {/* ── Archive modal ─────────────────────────────────────────────────────── */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center
                        bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl">

            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200
                            flex items-center justify-center mb-5 text-lg">
              🗑
            </div>

            <h3 className="text-base font-extrabold text-slate-900 mb-2">
              Archive {client.firmName}?
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              This will immediately revoke the client&apos;s portal access and move all
              their data to the archive. You can restore it within 30 days. After 30 days,
              all data is permanently deleted.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5
                            flex gap-2 text-xs text-amber-800 leading-relaxed">
              Client can be restored within <strong>&nbsp;30 days</strong>&nbsp;by any Admin.
              After 30 days data is permanently deleted.
            </div>

            <p className="text-xs font-medium text-slate-600 mb-1.5">
              Type{' '}
              <span className="font-mono font-bold text-slate-900">{client.firmName}</span>
              {' '}to confirm
            </p>
            <input
              type="text"
              value={archiveConfirm}
              onChange={e => setArchiveConfirm(e.target.value)}
              placeholder="Type client name to confirm…"
              className="w-full h-9 border border-slate-200 rounded-lg px-3 font-mono
                         text-sm text-slate-900 focus:outline-none focus:border-red-400
                         focus:ring-2 focus:ring-red-100 mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setArchiveModalOpen(false); setArchiveConfirm('') }}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-white
                           text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveFromDetail}
                disabled={
                  archiveConfirm.toLowerCase() !== client.firmName.toLowerCase() || archiving
                }
                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-semibold
                           hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {archiving ? 'Archiving…' : 'Archive Client'}
              </button>
            </div>
          </div>
        </div>
      )}

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
