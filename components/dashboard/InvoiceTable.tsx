'use client'

import { useState, useCallback } from 'react'
import { FilterChips } from '@/components/dashboard/FilterChips'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { MarkDoneButton } from '@/components/dashboard/MarkDoneButton'
import { filterRows, countByChip } from '@/lib/dashboard/client'
import type { ReconRow, FilterChip } from '@/lib/dashboard/client'

function formatDate(iso: string): string {
  // Parse date-only strings manually to avoid UTC-to-local timezone shift
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num) || num === 0) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const REASON_LABELS: Record<string, string> = {
  AUTO_ACCEPTED:           'Matched',
  AUTO_REJECTED:           'Mismatch',
  NOT_IN_BOOKS:            'Not in books',
  PENDING_REVIEW:          'Review',
  WRONG_GSTIN:             'Wrong GSTIN',
  VALUE_MISMATCH_2_10:     'Value diff (2–10%)',
  VALUE_OVER_10:           'Value diff (>10%)',
  DATE_GAP:                'Date mismatch',
  FORMAT_VARIATION:        'Format variation',
  INVOICE_NUMBER_MISMATCH: 'Invoice # mismatch',
  DUPLICATE:               'Duplicate',
}

interface InvoiceTableProps {
  initialRows: ReconRow[]
}

export function InvoiceTable({ initialRows }: InvoiceTableProps) {
  const [allRows, setAllRows] = useState<ReconRow[]>(initialRows)
  const [visibleRows, setVisibleRows] = useState<ReconRow[]>(initialRows)
  const [activeChip, setActiveChip] = useState<FilterChip>('all')

  const handleChipChange = useCallback(
    (chip: FilterChip) => {
      setActiveChip(chip)
      setVisibleRows(filterRows(allRows, chip))
    },
    [allRows],
  )

  const handleToggle = useCallback((resultId: string, isDone: boolean) => {
    const updateRow = (r: ReconRow) =>
      r.resultId === resultId ? { ...r, isDone } : r

    setAllRows(prev => {
      const next = prev.map(updateRow)
      setVisibleRows(filterRows(next, activeChip))
      return next
    })
  }, [activeChip])

  const counts = countByChip(allRows)

  return (
    <div className="space-y-4">
      <FilterChips active={activeChip} counts={counts} onChange={handleChipChange} />

      {visibleRows.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">
          No invoices match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[1000px] divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {([
                  ['Supplier GSTIN', 'text-left',  'w-[140px]'],
                  ['Invoice #',      'text-left',  'w-[95px]'],
                  ['Date',           'text-left',  'w-[80px]'],
                  ['Taxable',        'text-right', 'w-[75px]'],
                  ['IGST',           'text-right', 'w-[65px]'],
                  ['CGST',           'text-right', 'w-[65px]'],
                  ['SGST',           'text-right', 'w-[65px]'],
                  ['ITC at Risk',    'text-right', 'w-[80px]'],
                  ['Status',         'text-left',  'w-[105px]'],
                  ['Reason',         'text-left',  'w-[100px]'],
                  ['Action',         'text-left',  'w-[140px]'],
                ] as const).map(([h, align, width]) => (
                  <th
                    key={h}
                    className={`px-3 py-3 ${align} text-xs font-medium uppercase tracking-wide text-gray-500 ${width}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visibleRows.map(row => (
                <tr key={row.resultId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.supplierGstin}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{row.invoiceNumber}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{formatDate(row.invoiceDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{formatINR(row.taxableValue)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{formatINR(row.igst)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{formatINR(row.cgst)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{formatINR(row.sgst)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium">
                    {row.matchOutcome === 'AUTO_ACCEPTED' ? '—' : formatINR(row.itcAtRisk)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusBadge value={row.matchOutcome} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                    {REASON_LABELS[row.reasonCode] ?? row.reasonCode}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.matchOutcome !== 'AUTO_ACCEPTED' && (
                      <MarkDoneButton
                        resultId={row.resultId}
                        isDone={row.isDone}
                        onToggle={handleToggle}
                      />
                    )}
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
