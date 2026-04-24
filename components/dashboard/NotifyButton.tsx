'use client'

import { useState, useEffect, useRef } from 'react'

type ButtonState = 'idle' | 'confirm' | 'sending' | 'done'

export function NotifyButton({ clientId }: { clientId: string }) {
  const [state, setState] = useState<ButtonState>('idle')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const handleConfirm = async () => {
    setState('sending')
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
    } finally {
      setState('done')
      setTimeout(() => { if (mountedRef.current) setState('idle') }, 2000)
    }
  }

  if (state === 'confirm') {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span className="text-gray-500 text-xs">Send reminder?</span>
        <button
          type="button"
          onClick={handleConfirm}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          Send
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </span>
    )
  }

  if (state === 'sending') {
    return <span className="text-xs text-gray-400">Sending…</span>
  }

  if (state === 'done') {
    return <span className="text-xs font-medium text-emerald-600">Sent ✓</span>
  }

  return (
    <button
      type="button"
      onClick={() => setState('confirm')}
      className="text-sm font-medium text-blue-600 hover:text-blue-800"
    >
      Notify
    </button>
  )
}
