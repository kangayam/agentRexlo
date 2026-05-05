import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import Decimal from 'decimal.js'

function leakageCause(outcome: string, reasonCode: string): { cause: string; recoverable: boolean } {
  if (outcome === 'NOT_IN_BOOKS')
    return { cause: "Supplier didn't file GSTR-1", recoverable: true }
  if (outcome === 'AUTO_REJECTED' && reasonCode === 'WRONG_GSTIN')
    return { cause: 'Rejected by GSTN — permanent', recoverable: false }
  if (outcome === 'AUTO_REJECTED')
    return { cause: 'Value mismatch vs Tally books', recoverable: true }
  return { cause: 'Invoice not in Tally books', recoverable: true }
}

function qualityBand(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 45) return 'Poor'
  return 'Critical'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const client = await prisma.client.findUnique({
    where: { id: clientId, org_id: user.org_id },
    select: { id: true },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const periodParam = searchParams.get('period')

  const latest = await prisma.uploadSession.findFirst({
    where: { client_gstin: { client_id: clientId }, status: 'DONE' },
    orderBy: { period: 'desc' },
    select: { period: true },
  })
  const period = periodParam ?? latest?.period ?? null

  const empty = {
    leakage: { items: [], totalRecoverable: '0', total: '0' },
    quality: { score: 0, band: 'Critical', autoAcceptRate: 0, itcRecoveryRate: 0, deadlineAdherence: 80 },
    aging: [],
    vendors: null as null | unknown[],
    dayOfMonth: new Date().getDate(),
  }
  if (!period) return NextResponse.json(empty)

  const results = await prisma.reconciliationResult.findMany({
    where: {
      ims_invoice: {
        upload_session: {
          client_gstin: { client_id: clientId },
          period,
          status: 'DONE',
        },
      },
    },
    include: { ims_invoice: true },
  })

  // — Leakage breakdown —
  const leakageMap = new Map<string, { amount: Decimal; count: number; recoverable: boolean }>()
  let totalInvoices = 0
  let autoAccepted = 0
  let autoAcceptedValue = new Decimal(0)
  let totalValue        = new Decimal(0)
  let leakageTotal      = new Decimal(0)

  for (const r of results) {
    totalInvoices++
    const amt = new Decimal(r.itc_at_risk)
    totalValue = totalValue.plus(amt)

    if (r.outcome === 'AUTO_ACCEPTED') {
      autoAccepted++
      autoAcceptedValue = autoAcceptedValue.plus(amt)
      continue
    }

    const { cause, recoverable } = leakageCause(r.outcome, r.reason_code)
    leakageTotal = leakageTotal.plus(amt)
    const entry = leakageMap.get(cause)
    if (entry) { entry.amount = entry.amount.plus(amt); entry.count++ }
    else leakageMap.set(cause, { amount: amt, count: 1, recoverable })
  }

  const leakageItems = [...leakageMap.entries()]
    .map(([cause, d]) => ({ cause, amount: d.amount.toFixed(2), count: d.count, recoverable: d.recoverable }))
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))

  const totalRecoverable = leakageItems
    .filter(i => i.recoverable)
    .reduce((s, i) => s.plus(i.amount), new Decimal(0))
    .toFixed(2)

  // — Quality score —
  const autoAcceptRate  = totalInvoices > 0 ? autoAccepted / totalInvoices : 0
  // ITC recovery rate = value of auto-accepted invoices / total ITC value
  const itcRecoveryRate = totalValue.gt(0) ? autoAcceptedValue.div(totalValue).toNumber() : 1
  const score = Math.round((autoAcceptRate * 50) + (itcRecoveryRate * 30) + (0.8 * 20))

  // — ITC Aging —
  const today = new Date()
  type AgingEntry = { amount: Decimal; count: number; suppliers: Set<string> }
  const buckets: Record<string, AgingEntry> = {
    '0–30d':  { amount: new Decimal(0), count: 0, suppliers: new Set() },
    '31–60d': { amount: new Decimal(0), count: 0, suppliers: new Set() },
    '61–90d': { amount: new Decimal(0), count: 0, suppliers: new Set() },
    '90+':    { amount: new Decimal(0), count: 0, suppliers: new Set() },
  }

  for (const r of results) {
    if (r.outcome === 'AUTO_ACCEPTED' || r.is_done) continue
    const days = Math.floor((today.getTime() - new Date(r.ims_invoice.invoice_date).getTime()) / 86_400_000)
    const key = days <= 30 ? '0–30d' : days <= 60 ? '31–60d' : days <= 90 ? '61–90d' : '90+'
    buckets[key].amount = buckets[key].amount.plus(r.itc_at_risk)
    buckets[key].count++
    buckets[key].suppliers.add(r.ims_invoice.supplier_gstin)
  }

  const aging = Object.entries(buckets).map(([bucket, d]) => ({
    bucket,
    amount: d.amount.toFixed(2),
    count: d.count,
    suppliers: [...d.suppliers],
  }))

  // — Pre-14th vendor list —
  const dom = today.getDate()
  const vendors = (dom >= 10 && dom <= 13)
    ? results
        .filter(r => r.outcome !== 'AUTO_ACCEPTED' && !r.is_done)
        .map(r => ({
          supplierGstin: r.ims_invoice.supplier_gstin,
          invoiceNumber: r.ims_invoice.invoice_number,
          amount: r.itc_at_risk,
          reason: r.reason_code,
          outcome: r.outcome,
        }))
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    : null

  return NextResponse.json({
    leakage: { items: leakageItems, totalRecoverable, total: leakageTotal.toFixed(2) },
    quality: {
      score,
      band: qualityBand(score),
      autoAcceptRate:    Math.round(autoAcceptRate * 100),
      itcRecoveryRate:   Math.round(itcRecoveryRate * 100),
      deadlineAdherence: 80,
    },
    aging,
    vendors,
    dayOfMonth: dom,
  })
}
