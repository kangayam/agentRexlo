'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface LogoutModalProps {
  open:     boolean
  onClose:  () => void
  userName: string
}

export function LogoutModal({ open, onClose, userName }: LogoutModalProps) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const handleConfirm = async () => {
    setSigningOut(true)
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative"
        style={{ zIndex: 100000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red accent top bar */}
        <div className="h-1 bg-gradient-to-r from-red-600 to-orange-500" />

        <div className="p-7 text-center">
          <div className="w-[52px] h-[52px] rounded-full bg-red-50 border border-red-200
                          flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>

          <h2 className="text-base font-extrabold text-slate-900 mb-2 tracking-tight">
            Sign out of AgentGST?
          </h2>

          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            You are signed in as{' '}
            <span className="font-semibold text-slate-800">{userName}</span>.<br />
            Your data is saved automatically.
          </p>

          <div className="flex gap-2.5 mb-3">
            <button
              onClick={onClose}
              autoFocus
              className="flex-1 h-10 rounded-lg bg-slate-50 text-slate-700
                         border border-slate-200 text-sm font-medium
                         hover:bg-slate-100 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={signingOut}
              className="flex-1 h-10 rounded-lg bg-slate-900 text-white
                         text-sm font-semibold hover:bg-slate-800 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-slate-500
                         disabled:opacity-60"
            >
              {signingOut ? 'Signing out…' : 'Yes, sign out'}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">
              Esc
            </kbd>{' '}
            to cancel
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
