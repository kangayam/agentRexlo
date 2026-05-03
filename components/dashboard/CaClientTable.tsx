'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { NotifyButton } from '@/components/dashboard/NotifyButton'
import type { CaClientRow } from '@/lib/dashboard/ca'

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num) || num === 0) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function CaClientTable({ rows }: { rows: CaClientRow[] }) {
  const router = useRouter()

  const [viewQueueError, setViewQueueError] = useState<string | null>(null)

  const handleViewQueue = async (clientId: string) => {
    setViewQueueError(null)
    const res = await fetch(`/api/clients/${clientId}/acting-as`, { method: 'POST' })
    if (res.ok) {
      router.push('/client/dashboard')
    } else {
      const data = await res.json().catch(() => ({}))
      setViewQueueError(data.error ?? `Error ${res.status} — Failed to switch client.`)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        No clients yet. Add your first client above.
      </p>
    )
  }

  return (
    <div>
      {viewQueueError && (
        <p className="mb-2 text-sm text-red-500">{viewQueueError}</p>
      )}
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Client', 'GSTINs', 'ITC at Risk', 'Pending Actions', 'Status', 'Actions'].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map(row => (
            <tr key={row.clientId} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
              <td className="px-4 py-3 text-gray-500">
                {row.gstinCount} {row.gstinCount === 1 ? 'GSTIN' : 'GSTINs'}
              </td>
              <td className="px-4 py-3 tabular-nums">{formatINR(row.itcAtRisk)}</td>
              <td className="px-4 py-3 tabular-nums">
                {row.pendingActions > 0 ? row.pendingActions : '—'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={row.status} />
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-4">
                  <NotifyButton clientId={row.clientId} />
                  <button
                    type="button"
                    onClick={() => handleViewQueue(row.clientId)}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    View Queue →
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
