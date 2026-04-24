import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { computeSummaryCards } from '@/lib/dashboard/client'
import type { ReconRow } from '@/lib/dashboard/client'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { InvoiceTable } from '@/components/dashboard/InvoiceTable'
import Decimal from 'decimal.js'

export default async function ClientDashboardPage() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const actingAs = cookieStore.get('actingAsClientId')?.value
  const clientId = actingAs ?? (user.role === 'CLIENT' ? user.client_id : null)
  if (!clientId) redirect('/ca/dashboard')

  // If acting-as, verify caller is a CA and owns this client
  if (actingAs) {
    if (user.role !== 'CA_ADMIN' && user.role !== 'CA_STAFF') {
      redirect('/client/dashboard') // CLIENT users can't use acting-as
    }
    const owned = await prisma.client.findUnique({
      where: { id: actingAs, org_id: user.org_id ?? '' },
      select: { id: true },
    })
    if (!owned) redirect('/ca/dashboard') // client doesn't belong to this CA's org
  }

  // Find the latest completed upload period for this client
  const latest = await prisma.uploadSession.findFirst({
    where: { client_gstin: { client_id: clientId }, status: 'DONE' },
    orderBy: { period: 'desc' },
    select: { period: true },
  })

  const period = latest?.period ?? null

  let rows: ReconRow[] = []
  let periodLabel = 'No data yet'

  if (period) {
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

    rows = results.map(r => ({
      resultId:      r.id,
      supplierGstin: r.ims_invoice.supplier_gstin,
      invoiceNumber: r.ims_invoice.invoice_number,
      invoiceDate:   r.ims_invoice.invoice_date.toISOString().slice(0, 10),
      taxableValue:  r.ims_invoice.taxable_value,
      igst:          r.ims_invoice.igst,
      cgst:          r.ims_invoice.cgst,
      sgst:          r.ims_invoice.sgst,
      itcAtRisk:     r.itc_at_risk,
      matchOutcome:  r.outcome,
      reasonCode:    r.reason_code,
      isDone:        r.is_done,
      doneAt:        r.done_at?.toISOString() ?? null,
    }))

    rows.sort((a, b) => new Decimal(b.itcAtRisk).minus(a.itcAtRisk).toNumber())

    // Format period "YYYY-MM" → "Month YYYY" for display
    const [yyyy, mm] = period.split('-')
    const d = new Date(Number(yyyy), Number(mm) - 1, 1)
    periodLabel = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  }

  const summaryData = computeSummaryCards(rows)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">ITC Reconciliation</h1>
        <p className="mt-1 text-sm text-gray-500">{periodLabel}</p>
      </div>
      <SummaryCards data={summaryData} />
      <InvoiceTable initialRows={rows} />
    </div>
  )
}
