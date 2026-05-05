import type { SummaryCards as SummaryData } from '@/lib/dashboard/client'

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return '₹0'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const CARDS = [
  {
    key:       'safe',
    label:     'ITC Safe',
    subtitle:  'Auto-matched invoices',
    bg:        'bg-green-50',
    border:    'border-green-200',
    valueText: 'text-green-700',
    subText:   'text-green-600',
  },
  {
    key:       'atRisk',
    label:     'ITC At Risk',
    subtitle:  'Pending your review',
    bg:        'bg-amber-50',
    border:    'border-amber-200',
    valueText: 'text-amber-700',
    subText:   'text-amber-600',
  },
  {
    key:       'blocked',
    label:     'ITC Blocked',
    subtitle:  'Rejected invoices',
    bg:        'bg-red-50',
    border:    'border-red-200',
    valueText: 'text-red-700',
    subText:   'text-red-600',
  },
  {
    key:       'unverified',
    label:     'ITC Unverified',
    subtitle:  'Not in books',
    bg:        'bg-slate-50',
    border:    'border-slate-200',
    valueText: 'text-slate-600',
    subText:   'text-slate-500',
  },
] as const

export function SummaryCards({ data }: { data: SummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {CARDS.map(card => (
        <div key={card.key} className={`rounded-xl p-5 border ${card.bg} ${card.border}`}>
          <p className="text-sm font-medium text-slate-500 mb-2">{card.label}</p>
          <p className={`text-2xl font-extrabold font-mono tracking-tight ${card.valueText}`}>
            {formatINR(data[card.key])}
          </p>
          <p className={`text-xs font-medium mt-1 ${card.subText}`}>{card.subtitle}</p>
        </div>
      ))}
    </div>
  )
}
