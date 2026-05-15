'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function Nav() {
  const [open, setOpen] = useState(false)

  const links = [
    { label: 'Features',      href: '#features'      },
    { label: 'How It Works',  href: '#how-it-works'  },
    { label: 'Pricing',       href: '#pricing'       },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1629]/85 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-[#00bfad] font-extrabold text-xl tracking-tight">AgentGST</span>
          <span className="hidden sm:inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full
                           bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 tracking-wider uppercase">
            Powered by Agentic AI
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.label} href={l.href}
               className="text-sm text-slate-300 hover:text-white transition-colors font-medium">
              {l.label}
            </a>
          ))}
          <a href="#cta"
             className="px-4 py-2 rounded-lg bg-[#00bfad] text-white text-sm font-bold
                        hover:bg-[#00a89a] transition-colors">
            Join Pilot Program
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-300 hover:text-white transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-[#0f1629] border-t border-white/10 px-6 py-5 space-y-1">
          {links.map(l => (
            <a key={l.label} href={l.href}
               onClick={() => setOpen(false)}
               className="block py-3 text-sm text-slate-300 hover:text-white transition-colors font-medium border-b border-white/5">
              {l.label}
            </a>
          ))}
          <div className="pt-3">
            <a href="#cta"
               onClick={() => setOpen(false)}
               className="block w-full text-center py-3 rounded-lg bg-[#00bfad] text-white text-sm font-bold">
              Join Pilot Program
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
