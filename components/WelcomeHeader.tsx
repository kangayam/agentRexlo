'use client'

import { Bell } from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface WelcomeHeaderProps {
  userName: string
}

export function WelcomeHeader({ userName }: WelcomeHeaderProps) {
  const initial = (userName.trim()[0] ?? '?').toUpperCase()
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="bg-white border-b border-slate-200 px-8 py-3
                    flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500
                        to-indigo-500 flex items-center justify-center
                        text-white font-bold text-sm flex-shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-xs text-slate-500">{getGreeting()},</p>
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            {userName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">{today}</p>
          <p className="text-xs text-slate-400">
            Session active · expires in 30 min
          </p>
        </div>
        <button className="relative w-9 h-9 rounded-lg bg-slate-50
                           border border-slate-200 flex items-center
                           justify-center hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full
                           bg-red-500 text-white text-[9px] font-bold
                           flex items-center justify-center border-2 border-white">
            1
          </span>
        </button>
      </div>
    </div>
  )
}
