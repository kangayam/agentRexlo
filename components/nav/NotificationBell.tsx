// components/nav/NotificationBell.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface NotificationItem {
  id: string
  message: string
  type: 'CA_NOTIFY_CLIENT' | 'CLIENT_COMPLETED' | 'CLIENT_UPLOADED' | 'UPLOAD_FAILED'
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

const TYPE_LABELS: Record<NotificationItem['type'], { label: string; className: string }> = {
  CA_NOTIFY_CLIENT:  { label: 'Reminder',  className: 'bg-amber-100 text-amber-800' },
  CLIENT_UPLOADED:   { label: 'Uploaded',  className: 'bg-blue-100 text-blue-800' },
  CLIENT_COMPLETED:  { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  UPLOAD_FAILED:     { label: 'Failed',    className: 'bg-red-100 text-red-800' },
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)} days ago`
}

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [data, setData] = useState<NotificationsResponse>({ notifications: [], unreadCount: 0 })
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setData(await res.json())
    } catch {
      // silently ignore fetch failures
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpen = () => {
    setOpen(v => !v)
    fetchNotifications()
  }

  const markRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await fetchNotifications()
    } catch {
      // silently ignore
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      await fetchNotifications()
    } catch {
      // silently ignore
    }
  }

  return (
    <div ref={containerRef} className="relative px-3">
      <button
        type="button"
        onClick={handleOpen}
        className={`flex w-full items-center gap-2 rounded-md px-0 py-2 text-sm font-medium transition-colors ${dark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <span className="relative inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {data.unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {data.unreadCount > 9 ? '9+' : data.unreadCount}
            </span>
          )}
        </span>
        <span>Notifications</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notifications
            </span>
            {data.unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {data.notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {data.notifications.map(n => (
                <li
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`cursor-pointer px-4 py-3 hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 line-clamp-2">{n.message}</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_LABELS[n.type].className}`}>
                      {TYPE_LABELS[n.type].label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
