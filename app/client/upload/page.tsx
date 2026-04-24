import { redirect } from 'next/navigation'
import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { GstinUploadCard, SessionState } from '@/components/upload/GstinUploadCard'
import { getDefaultPeriodValue } from '@/components/upload/PeriodPicker'

// Map state code (first 2 chars of GSTIN) to state name
const STATE_NAMES: Record<string, string> = {
  '01': 'J&K',        '02': 'Himachal',    '03': 'Punjab',       '04': 'Chandigarh',
  '05': 'Uttarakhand','06': 'Haryana',      '07': 'Delhi',        '08': 'Rajasthan',
  '09': 'UP',         '10': 'Bihar',        '11': 'Sikkim',       '12': 'Arunachal',
  '13': 'Nagaland',   '14': 'Manipur',      '15': 'Mizoram',      '16': 'Tripura',
  '17': 'Meghalaya',  '18': 'Assam',        '19': 'West Bengal',  '20': 'Jharkhand',
  '21': 'Odisha',     '22': 'Chhattisgarh', '23': 'MP',           '24': 'Gujarat',
  '25': 'Daman & Diu','26': 'DNH',          '27': 'Maharashtra',  '28': 'AP (old)',
  '29': 'Karnataka',  '30': 'Goa',          '31': 'Lakshadweep',  '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry',   '35': 'A&N Islands',  '36': 'Telangana',
  '37': 'AP',
}

export default async function ClientUploadPage() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) redirect('/login')

  const clientId = await getEffectiveClientId()
  if (!clientId) redirect('/ca/clients')

  const defaultPeriod = getDefaultPeriodValue()

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      gstins: {
        include: {
          upload_sessions: {
            where: { period: defaultPeriod },
            include: {
              _count: { select: { ims_invoices: true, tally_entries: true } },
            },
            take: 1,
          },
        },
        orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
      },
    },
  })

  if (!client) redirect('/login')

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Upload Files</h1>
        <p className="text-sm text-gray-500 mt-1">{client.name}</p>
      </div>

      <div className="flex flex-col gap-4">
        {client.gstins.map(g => {
          const s = g.upload_sessions[0]
          const initialSession: SessionState = {
            sessionId:       s?.id ?? null,
            status:          s?.status ?? null,
            imsUploadedAt:   s?.ims_uploaded_at?.toISOString() ?? null,
            imsCount:        s?._count.ims_invoices ?? 0,
            tallyUploadedAt: s?.tally_uploaded_at?.toISOString() ?? null,
            tallyCount:      s?._count.tally_entries ?? 0,
          }
          return (
            <GstinUploadCard
              key={g.id}
              clientGstinId={g.id}
              gstin={g.gstin}
              stateName={STATE_NAMES[g.gstin.slice(0, 2)] ?? 'Unknown'}
              defaultPeriod={defaultPeriod}
              initialSession={initialSession}
            />
          )
        })}
      </div>
    </main>
  )
}
