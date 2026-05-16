'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function Nav() {
  const [open, setOpen] = useState(false)

  const links = [
    { label: 'Features',     href: '#features'     },
    { label: 'How It Works', href: '#how-it-works'  },
    { label: 'Pricing',      href: '#pricing'       },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-[#0d1f2d] font-extrabold text-xl tracking-tight">AgentGST</span>
          <span className="hidden sm:inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full
                           bg-indigo-50 text-indigo-600 border border-indigo-200 tracking-wider uppercase">
            Powered by Agentic AI
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.label} href={l.href}
               className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">
              {l.label}
            </a>
          ))}
          <a href="#cta"
             className="px-4 py-2 rounded-lg bg-[#0d1f2d] text-white text-sm font-bold
                        hover:bg-[#1e3448] transition-colors">
            Join Pilot Program
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-600 hover:text-slate-900 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-1">
          {links.map(l => (
            <a key={l.label} href={l.href}
               onClick={() => setOpen(false)}
               className="block py-3 text-sm text-slate-600 hover:text-slate-900 transition-colors
                          font-medium border-b border-slate-100">
              {l.label}
            </a>
          ))}
          <div className="pt-3">
            <a href="#cta"
               onClick={() => setOpen(false)}
               className="block w-full text-center py-3 rounded-lg bg-[#0d1f2d] text-white
                          text-sm font-bold hover:bg-[#1e3448] transition-colors">
              Join Pilot Program
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
