export function TrustedBy() {
  const firms = [
    'MEHTA & CO.',
    'RAJESH ASSOCIATES',
    'SURESH CPA',
    'SHARMA & PARTNERS',
    'VENKAT TAX',
  ]

  return (
    <section className="bg-[#f7f7f7] border-y border-[#E2E8F0] py-10 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
          Trusted by CA firms managing ₹500Cr+ in ITC across India
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {firms.map(f => (
            <span key={f}
                  className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200
                             text-xs font-bold text-slate-400 tracking-wide">
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
