const footerLinks = [
  { label: 'Features',    href: '#features'      },
  { label: 'Pricing',     href: '#pricing'       },
  { label: 'CA Partners', href: '#cta'           },
  { label: 'Privacy',     href: '/privacy'       },
  { label: 'Terms',       href: '/terms'         },
]

export function Footer() {
  return (
    <footer className="bg-[#0f1629] border-t border-white/10 px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center
                      justify-between gap-6 text-sm">

        {/* Left */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
            <span className="text-[#00bfad] font-extrabold text-lg">AgentGST</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-indigo-500/15 text-indigo-300 border border-indigo-500/30
                             tracking-wider uppercase">
              Powered by Agentic AI
            </span>
          </div>
          <p className="text-xs text-[#64748b]">© 2026 AgentGST. All rights reserved.</p>
        </div>

        {/* Center links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {footerLinks.map(l => (
            <a key={l.label} href={l.href}
               className="text-xs text-[#64748b] hover:text-slate-300 transition-colors font-medium">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right */}
        <div className="text-center md:text-right">
          <a href="mailto:partners@agentgst.in"
             className="text-xs text-[#64748b] hover:text-slate-300 transition-colors">
            partners@agentgst.in
          </a>
        </div>

      </div>
    </footer>
  )
}
