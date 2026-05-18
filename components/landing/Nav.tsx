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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
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
             className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
            Sign in
          </a>
          <a href="#cta"
             className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold
                        hover:bg-indigo-700 transition-colors shadow-sm">
            Request a Demo
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
          <div className="pt-3 flex flex-col gap-2">
            <a href="/login"
               onClick={() => setOpen(false)}
               className="block w-full text-center py-3 rounded-lg border border-indigo-200
                          text-indigo-600 text-sm font-semibold">
              Sign in
            </a>
            <a href="#cta"
               onClick={() => setOpen(false)}
               className="block w-full text-center py-3 rounded-lg bg-indigo-600 text-white
                          text-sm font-bold hover:bg-indigo-700 transition-colors">
              Request a Demo
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
