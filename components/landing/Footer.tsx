import Image from 'next/image'

export function Footer() {
  const links = [
    { label: 'Products',    href: '#features'    },
    { label: 'Pricing',     href: '#pricing'     },
    { label: 'CA Partners', href: '#cta'         },
    { label: 'Privacy',     href: '/privacy'     },
  ]

  return (
    <footer className="bg-white border-t border-slate-200 py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center
                      justify-between gap-6 flex-wrap">

        {/* Logo */}
        <Image
          src="/rexlo-logo.png"
          alt="Rexlo"
          width={100}
          height={30}
          className="h-7 w-auto object-contain"
        />

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6">
          {links.map(l => (
            <a key={l.label} href={l.href}
               className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
              {l.label}
            </a>
          ))}
          <a href="mailto:partners@gstrecon.in"
             className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
            partners@gstrecon.in
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-slate-400">
          © 2026 Rexlo. All rights reserved.
        </p>

      </div>
    </footer>
  )
}
