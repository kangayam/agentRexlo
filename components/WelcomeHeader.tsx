'use client'

import { NotificationBell } from '@/components/nav/NotificationBell'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface WelcomeHeaderProps {
  userName:  string
  firmName?: string
}

export function WelcomeHeader({ userName, firmName }: WelcomeHeaderProps) {
  const firstName = userName.trim().split(' ')[0]
  const initial   = (firstName[0] ?? '?').toUpperCase()
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const avatarGradient = firmName
    ? 'from-orange-400 to-amber-500'
    : 'from-blue-500 to-indigo-500'

  return (
    <div className="bg-white border-b border-slate-200 px-8 py-3
                    flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient}
                        flex items-center justify-center
                        text-white font-bold text-sm flex-shrink-0`}>
          {initial}
        </div>
        <div>
          <p className="text-xs text-slate-500">{getGreeting()}, {firstName}</p>
          {firmName ? (
            <p className="text-sm font-semibold text-blue-600 leading-tight">
              {firmName}
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {userName}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">{today}</p>
          <p className="text-xs text-slate-400">
            Session active · expires in 30 min
          </p>
        </div>
        <NotificationBell compact />
      </div>
    </div>
  )
}
