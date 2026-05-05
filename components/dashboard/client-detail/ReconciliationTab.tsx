'use client'

import { useEffect, useState } from 'react'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { InvoiceTable } from '@/components/dashboard/InvoiceTable'
import type { ReconRow, SummaryCards as SummaryData } from '@/lib/dashboard/client'

interface ReconResponse {
  rows:    ReconRow[]
  summary: SummaryData
  period:  string | null
  periods: string[]
}

interface Props {
  clientId:       string
  period:         string | null
  onPendingCount: (n: number) => void
  onPeriods:      (p: string[]) => void
}

export function ReconciliationTab({ clientId, period, onPendingCount, onPeriods }: Props) {
  const [data, setData] = useState<ReconResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = period ? `?period=${period}` : ''
    fetch(`/api/clients/${clientId}/reconciliation${qs}`)
      .then(r => r.json())
      .then((d: ReconResponse) => {
        setData(d)
        onPeriods(d.periods)
        const pending = d.rows.filter(r => r.matchOutcome !== 'AUTO_ACCEPTED' && !r.isDone).length
        onPendingCount(pending)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // onPeriods and onPendingCount are callbacks — exclude from deps to avoid infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, period])

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
  if (!data?.period) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        No reconciliation data yet for this client.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards data={data.summary} />
      <InvoiceTable initialRows={data.rows} />
    </div>
  )
}
