export function getDefaultPeriodValue(): string {
  const now = new Date()
  // GSTN publishes IMS on the 14th — use previous month on or after the 14th
  const useCurrentMonth = now.getDate() < 14
  const target = useCurrentMonth ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`
}
