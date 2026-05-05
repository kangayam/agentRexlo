'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Users, BarChart2, Bell, UserCheck, Upload, Clock, type LucideIcon } from 'lucide-react'
import { NotificationBell } from '@/components/nav/NotificationBell'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  BarChart2,
  Bell,
  UserCheck,
  Upload,
  Clock,
}

export interface NavItem {
  label: string
  href: string
  icon?: keyof typeof ICON_MAP
  badge?: number
}

interface AppSidebarProps {
  navItems: NavItem[]
  userName: string
  userEmail: string
}

export function AppSidebar({ navItems, userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  const initial = (userName.trim()[0] ?? '?').toUpperCase()

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          AG
        </div>
        <span className="text-white font-bold text-sm tracking-tight">AgentGST</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon ? ICON_MAP[item.icon] : undefined
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-blue-500/15 text-white border-r-2 border-blue-500 rounded-r-none'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50',
              ].join(' ')}
            >
              {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Notifications row */}
      <div className="border-t border-slate-700 pt-2 pb-1">
        <NotificationBell dark />
      </div>

      {/* User row + sign out */}
      <div className="border-t border-slate-700 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate">{userName}</div>
            <div className="text-slate-500 text-[11px] truncate">{userEmail}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
