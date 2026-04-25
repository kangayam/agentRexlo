'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export interface NavItem {
  label: string
  href: string
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

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white px-3 py-4 flex-shrink-0">
      {/* Logo */}
      <div className="mb-6 px-2">
        <span className="text-lg font-bold text-gray-900">AgentFlow</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + sign out */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="px-3">
          <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
