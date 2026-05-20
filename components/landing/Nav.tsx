'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'

export function Nav() {
  const [open, setOpen] = useState(false)

  const links = [
    { label: 'Products',   href: '#features'   },
    { label: 'Solutions',  href: '#who-its-for' },
    { label: 'Resources',  href: '#screenshots' },
    { label: 'Pricing',    href: '#pricing'     },
  ]

  return (
    <nav aria-label="Main" className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/rexlo-logo.png"
            alt="Rexlo"
            width={120}
            height={36}
            priority
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.label} href={l.href}
               className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">
              {l.label}
            </a>
          ))}
          <a href="/login"
             className="text-sm text-[#4eb564] font-semibold hover:text-[#3da055] transition-colors">
            Sign in
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
                          font-medium border-b border-[#e2e8f0]">
              {l.label}
            </a>
          ))}
          <div className="pt-3">
            <a href="/login"
               onClick={() => setOpen(false)}
               className="block w-full text-center py-3 rounded-lg border border-[#bbf7d0]
                          text-[#4eb564] text-sm font-semibold">
              Sign in
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
