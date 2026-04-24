'use client'

import { useMemo } from 'react'
import { getDefaultPeriodValue } from '@/lib/upload/period'

interface PeriodPickerProps {
  value: string          // "YYYY-MM"
  onChange: (period: string) => void
}

function buildPeriodOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export { getDefaultPeriodValue }

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const options = useMemo(buildPeriodOptions, [])

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-36 h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
