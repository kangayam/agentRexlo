const BADGE_STYLES: Record<string, { label: string; className: string }> = {
  AUTO_ACCEPTED:  { label: 'Accepted',      className: 'bg-emerald-100 text-emerald-800' },
  AUTO_REJECTED:  { label: 'Rejected',      className: 'bg-red-100 text-red-800' },
  PENDING_REVIEW: { label: 'Review needed', className: 'bg-amber-100 text-amber-800' },
  NOT_IN_BOOKS:   { label: 'Not in books',  className: 'bg-gray-100 text-gray-700' },
  Urgent:         { label: 'Urgent',        className: 'bg-red-100 text-red-800' },
  Pending:        { label: 'Pending',       className: 'bg-amber-100 text-amber-800' },
  'All Done':     { label: 'All done',      className: 'bg-emerald-100 text-emerald-800' },
  'No Upload':    { label: 'No upload',     className: 'bg-gray-100 text-gray-500' },
}

export function StatusBadge({ value }: { value: string }) {
  const style = BADGE_STYLES[value] ?? { label: value, className: 'bg-gray-100 text-gray-700' }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  )
}
