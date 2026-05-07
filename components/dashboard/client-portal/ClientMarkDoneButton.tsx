'use client'

import { useState } from 'react'

interface ClientMarkDoneButtonProps {
  resultId: string
  isDone:   boolean
  onToggle: (resultId: string, isDone: boolean) => void
}

export function ClientMarkDoneButton({ resultId, isDone, onToggle }: ClientMarkDoneButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    const newDone = !isDone
    onToggle(resultId, newDone)
    try {
      const res = await fetch('/api/reconciliation/mark-done', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resultId, isDone: newDone }),
      })
      if (!res.ok) {
        onToggle(resultId, isDone)
        setError('Failed. Try again.')
      }
    } catch {
      onToggle(resultId, isDone)
      setError('Failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50
          ${isDone
            ? 'text-green-600 bg-green-50 border border-green-200 hover:bg-green-100'
            : 'text-white bg-green-600 hover:bg-green-700'
          }`}
      >
        {loading ? 'Saving…' : isDone ? '✓ Done' : 'Mark Done ✓'}
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </span>
  )
}
