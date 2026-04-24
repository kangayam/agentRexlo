'use client'

import type { FilterChip } from '@/lib/dashboard/client'

const CHIPS: { id: FilterChip; label: string }[] = [
  { id: 'all',             label: 'All' },
  { id: 'action-required', label: 'Action Required' },
  { id: 'flagged',         label: 'Flagged' },
  { id: 'not-in-books',    label: 'Not in Books' },
  { id: 'done',            label: 'Done' },
]

interface FilterChipsProps {
  active:   FilterChip
  counts:   Record<FilterChip, number>
  onChange: (chip: FilterChip) => void
}

export function FilterChips({ active, counts, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map(chip => (
        <button
          key={chip.id}
          onClick={() => onChange(chip.id)}
          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
            active === chip.id
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          {chip.label}
          <span className="ml-1.5 tabular-nums text-xs opacity-75">({counts[chip.id]})</span>
        </button>
      ))}
    </div>
  )
}
