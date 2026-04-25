import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

function formatPeriod(period: string): string {
  const [yyyy, mm] = period.split('-')
  return new Date(Number(yyyy), Number(mm) - 1, 1)
    .toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  DONE:       'bg-emerald-100 text-emerald-800',
  PENDING:    'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  FAILED:     'bg-red-100 text-red-800',
}

export default async function ClientHistoryPage() {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  const cookieStore = await cookies()
  const actingAs = cookieStore.get('actingAsClientId')?.value
  const clientId = actingAs ?? (user.role === 'CLIENT' ? user.client_id : null)
  if (!clientId) redirect('/ca/dashboard')

  // Validate acting-as org membership for CA users
  if (actingAs) {
    if (user.role !== 'CA_ADMIN' && user.role !== 'CA_STAFF') redirect('/ca/dashboard')
    const owned = await prisma.client.findUnique({
      where: { id: actingAs, org_id: user.org_id ?? '' },
      select: { id: true },
    })
    if (!owned) redirect('/ca/dashboard')
  }

  const sessions = await prisma.uploadSession.findMany({
    where: { client_gstin: { client_id: clientId } },
    include: {
      client_gstin: { select: { gstin: true } },
      uploaded_by:  { select: { name: true } },
      ims_invoices: {
        select: {
          reconciliation_result: { select: { outcome: true } },
        },
      },
    },
    orderBy: [{ period: 'desc' }, { created_at: 'desc' }],
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Upload History</h1>
        <p className="mt-1 text-sm text-gray-500">All reconciliation periods for this account</p>
      </div>

      {sessions.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">No uploads yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Period', 'GSTIN', 'Status', 'IMS Uploaded', 'Tally Uploaded', 'Uploaded by', 'Results'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {sessions.map(s => {
                const results = s.ims_invoices.map(i => i.reconciliation_result?.outcome).filter(Boolean)
                const matched  = results.filter(o => o === 'AUTO_ACCEPTED').length
                const rejected = results.filter(o => o === 'AUTO_REJECTED').length
                const review   = results.filter(o => o === 'PENDING_REVIEW').length
                const notIn    = results.filter(o => o === 'NOT_IN_BOOKS').length

                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{formatPeriod(s.period)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.client_gstin.gstin}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(s.ims_uploaded_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(s.tally_uploaded_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{s.uploaded_by.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 space-x-2">
                      {results.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <>
                          <span className="text-emerald-700">{matched} matched</span>
                          {rejected > 0 && <span className="text-red-600">{rejected} rejected</span>}
                          {review   > 0 && <span className="text-amber-600">{review} review</span>}
                          {notIn    > 0 && <span className="text-gray-500">{notIn} not in books</span>}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
