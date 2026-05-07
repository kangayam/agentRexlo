export function formatINR(val: number): string {
  if (isNaN(val) || val === 0) return '0'
  return val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function formatPeriod(period: string): string {
  const [yyyy, mm] = period.split('-')
  return new Date(Number(yyyy), Number(mm) - 1, 1)
    .toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}
