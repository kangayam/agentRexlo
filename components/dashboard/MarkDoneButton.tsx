'use client'

import { useState } from 'react'

interface MarkDoneButtonProps {
  resultId: string
  isDone:   boolean
  onToggle: (resultId: string, isDone: boolean) => void
}

export function MarkDoneButton({ resultId, isDone, onToggle }: MarkDoneButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    const newDone = !isDone
    onToggle(resultId, newDone) // optimistic update
    try {
      const res = await fetch('/api/reconciliation/mark-done', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId, isDone: newDone }),
      })
      if (!res.ok) {
        onToggle(resultId, isDone) // revert on error
        setError('Failed. Try again.')
      }
    } catch {
      onToggle(resultId, isDone) // revert on error
      setError('Failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`text-sm font-medium transition-colors disabled:opacity-50 ${
          isDone
            ? 'text-emerald-600 hover:text-emerald-800'
            : 'text-blue-600 hover:text-blue-800'
        }`}
      >
        {isDone ? '✓ Done' : 'Mark Done on GSTN'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
