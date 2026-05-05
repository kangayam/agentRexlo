const BADGE_STYLES: Record<string, { label: string; pill: string; dot: string }> = {
  AUTO_ACCEPTED:  { label: 'Accepted',      pill: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  AUTO_REJECTED:  { label: 'Rejected',      pill: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500' },
  PENDING_REVIEW: { label: 'Review needed', pill: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
  NOT_IN_BOOKS:   { label: 'Not in books',  pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  Urgent:         { label: 'Urgent',        pill: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500' },
  Pending:        { label: 'Pending',       pill: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
  'All Done':     { label: 'All done',      pill: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  'No Upload':    { label: 'No upload',     pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  Processing:     { label: 'Processing',    pill: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500 animate-pulse' },
}

export function StatusBadge({ value }: { value: string }) {
  const style = BADGE_STYLES[value] ?? {
    label: value,
    pill:  'bg-slate-100 text-slate-600 border-slate-200',
    dot:   'bg-slate-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      {style.label}
    </span>
  )
}
