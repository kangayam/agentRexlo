const stats = [
  { value: '80%', label: 'Less tax prep time'      },
  { value: '99%', label: 'Reconciliation accuracy' },
  { value: '5×',  label: 'ROI in Month 1'          },
  { value: '60%', label: 'Fewer govt notices'      },
]

export function StatsBar() {
  return (
    <section className="bg-white py-6 px-6">
      <div className="max-w-5xl mx-auto border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label}
                 className={`px-8 py-8 text-center
                   ${i < stats.length - 1 ? 'border-r border-slate-200' : ''}
                   ${i < 2 ? 'border-b border-slate-200 md:border-b-0' : ''}`}>
              <div className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-violet-500
                              bg-clip-text text-transparent mb-1">
                {s.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
