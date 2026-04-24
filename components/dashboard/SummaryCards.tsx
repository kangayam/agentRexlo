import type { SummaryCards as SummaryData } from '@/lib/dashboard/client'

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const CARDS = [
  { key: 'safe',       label: 'ITC Safe',       border: 'border-emerald-200', bg: 'bg-emerald-50' },
  { key: 'atRisk',     label: 'ITC At Risk',     border: 'border-amber-200',   bg: 'bg-amber-50' },
  { key: 'blocked',    label: 'ITC Blocked',     border: 'border-red-200',     bg: 'bg-red-50' },
  { key: 'unverified', label: 'ITC Unverified',  border: 'border-gray-200',    bg: 'bg-gray-50' },
] as const

export function SummaryCards({ data }: { data: SummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {CARDS.map(card => (
        <div key={card.key} className={`rounded-lg border p-4 ${card.border} ${card.bg}`}>
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatINR(data[card.key])}
          </p>
        </div>
      ))}
    </div>
  )
}
