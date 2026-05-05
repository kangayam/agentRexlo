'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { AlertCircle } from 'lucide-react'

const WARN_SECONDS = 120

export function InactivityWarning() {
  const router   = useRouter()
  const pathname = usePathname()
  const [showing, setShowing] = useState(false)
  const [seconds, setSeconds] = useState(WARN_SECONDS)

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      router.push(`/login?reason=timeout&from=${encodeURIComponent(pathname)}`)
    }
  }, [router, pathname])

  const handleWarn = useCallback(() => {
    setShowing(true)
    setSeconds(WARN_SECONDS)
  }, [])

  const handleStayIn = useCallback(() => {
    setShowing(false)
    setSeconds(WARN_SECONDS)
  }, [])

  useIdleTimer(handleWarn, handleLogout)

  useEffect(() => {
    if (!showing) return
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(t); handleLogout(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [showing, handleLogout])

  if (!showing) return null

  const mins = Math.floor(seconds / 60)
  const secs = String(seconds % 60).padStart(2, '0')
  const pct  = (seconds / WARN_SECONDS) * 100

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80
                    bg-slate-900 rounded-xl shadow-2xl overflow-hidden
                    animate-in slide-in-from-bottom-4 duration-300">
      {/* Draining progress bar */}
      <div className="h-1 bg-slate-700">
        <div
          className="h-full bg-red-500 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="p-4 flex gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center
                        justify-center flex-shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-0.5">
            Session expiring soon
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            No activity detected. Signing out in:
          </p>
          <p className="text-2xl font-bold text-red-400 font-mono my-2 tracking-tight">
            {mins}:{secs}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleStayIn}
              className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white
                         text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Stay signed in
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-1.5 rounded-lg text-slate-300 text-xs
                         font-medium border border-white/10
                         bg-white/[0.06] hover:bg-white/10 transition-colors"
            >
              Sign out now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
