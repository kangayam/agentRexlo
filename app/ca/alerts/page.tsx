import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { AlertsClient } from './AlertsClient'
import type { Alert } from './AlertsClient'
import Decimal from 'decimal.js'

export default async function AlertsPage() {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  if (user.role === 'CLIENT') redirect('/client/dashboard')

  const orgId = user.org_id ?? ''
  const today = new Date()
  const daysUntil14th = 14 - today.getDate()

  // Latest completed period across the org
  const latestSession = await prisma.uploadSession.findFirst({
    where: {
      client_gstin: { client: { org_id: orgId } },
    },
    orderBy: { period: 'desc' },
    select: { period: true },
  })
  const activePeriod = latestSession?.period ?? null

  // All clients with GSTINs and their latest upload session
  const clients = await prisma.client.findMany({
    where: { org_id: orgId },
    include: {
      gstins: {
        include: {
          upload_sessions: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Pending (not-done, non-AUTO_ACCEPTED) results for active period
  const pendingResults = activePeriod
    ? await prisma.reconciliationResult.findMany({
        where: {
          is_done: false,
          outcome: { not: 'AUTO_ACCEPTED' },
          ims_invoice: {
            upload_session: {
              period: activePeriod,
              client_gstin: { client: { org_id: orgId } },
            },
          },
        },
        include: {
          ims_invoice: {
            include: {
              upload_session: {
                include: {
                  client_gstin: {
                    include: { client: true },
                  },
                },
              },
            },
          },
        },
      })
    : []

  // Group results by client_id
  type ResultGroup = {
    client: (typeof clients)[0]
    gstin: string
    period: string
    unmatchedCount: number
    itcAtRisk: Decimal
    aging90Count: number
    aging90Risk: Decimal
    hasImsUpload: boolean
    hasTallyUpload: boolean
  }

  const byClient = new Map<string, ResultGroup>()

  for (const r of pendingResults) {
    const session = r.ims_invoice.upload_session
    const clientGstin = session.client_gstin
    const clientId = clientGstin.client_id
    const clientRecord = clients.find(c => c.id === clientId)
    if (!clientRecord) continue

    if (!byClient.has(clientId)) {
      byClient.set(clientId, {
        client: clientRecord,
        gstin: clientGstin.gstin,
        period: session.period,
        unmatchedCount: 0,
        itcAtRisk: new Decimal(0),
        aging90Count: 0,
        aging90Risk: new Decimal(0),
        hasImsUpload: !!session.ims_uploaded_at,
        hasTallyUpload: !!session.tally_uploaded_at,
      })
    }

    const g = byClient.get(clientId)!
    const risk = new Decimal(r.itc_at_risk)
    g.unmatchedCount += 1
    g.itcAtRisk = g.itcAtRisk.plus(risk)

    const invoiceDate = r.ims_invoice.invoice_date
    if (invoiceDate) {
      const ageDays = Math.floor(
        (today.getTime() - new Date(invoiceDate).getTime()) / 86_400_000,
      )
      if (ageDays > 90) {
        g.aging90Count += 1
        g.aging90Risk = g.aging90Risk.plus(risk)
      }
    }
  }

  const urgentAlerts: Alert[] = []

  // ITC_RISK and AGING_90 alerts from pending results
  for (const [clientId, g] of byClient) {
    if (g.unmatchedCount > 0 && g.itcAtRisk.gt(0)) {
      const itcNum = g.itcAtRisk.toNumber()
      urgentAlerts.push({
        id: `itc-${clientId}-${activePeriod}`,
        type: 'ITC_RISK',
        severity: itcNum > 100_000 ? 'critical' : 'warning',
        clientId,
        clientName: g.client.name,
        gstin: g.gstin,
        period: activePeriod ?? '',
        itcAtRisk: itcNum,
        unmatchedCount: g.unmatchedCount,
        daysUntil14th,
        lastRemindedAt: g.client.last_reminded_at?.toISOString() ?? null,
        hasImsUpload: g.hasImsUpload,
        hasTallyUpload: g.hasTallyUpload,
      })
    }

    if (g.aging90Count > 0) {
      urgentAlerts.push({
        id: `aging-${clientId}-${activePeriod}`,
        type: 'AGING_90',
        severity: 'warning',
        clientId,
        clientName: g.client.name,
        gstin: g.gstin,
        period: activePeriod ?? '',
        itcAtRisk: g.aging90Risk.toNumber(),
        unmatchedCount: g.aging90Count,
        daysUntil14th,
        lastRemindedAt: g.client.last_reminded_at?.toISOString() ?? null,
        hasImsUpload: true,
        hasTallyUpload: g.hasTallyUpload,
      })
    }
  }

  // Missing upload alerts from all clients
  for (const client of clients) {
    for (const gstin of client.gstins) {
      const latestUpload = gstin.upload_sessions[0]

      if (!latestUpload || !latestUpload.ims_uploaded_at) {
        // Skip if we already have an ITC_RISK alert for this client
        if (byClient.has(client.id)) continue
        urgentAlerts.push({
          id: `no-upload-${client.id}-${gstin.id}`,
          type: 'NO_UPLOAD',
          severity: 'info',
          clientId: client.id,
          clientName: client.name,
          gstin: gstin.gstin,
          period: latestUpload?.period ?? activePeriod ?? '',
          itcAtRisk: 0,
          unmatchedCount: 0,
          daysUntil14th,
          lastRemindedAt: null,
          hasImsUpload: false,
          hasTallyUpload: false,
        })
      } else if (!latestUpload.tally_uploaded_at) {
        if (byClient.has(client.id)) continue
        urgentAlerts.push({
          id: `no-tally-${client.id}-${gstin.id}`,
          type: 'NO_TALLY',
          severity: 'info',
          clientId: client.id,
          clientName: client.name,
          gstin: gstin.gstin,
          period: latestUpload.period,
          itcAtRisk: 0,
          unmatchedCount: 0,
          daysUntil14th,
          lastRemindedAt: null,
          hasImsUpload: true,
          hasTallyUpload: false,
        })
      }
    }
  }

  // Sort: critical first, then by itcAtRisk desc
  urgentAlerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1
    if (b.severity === 'critical' && a.severity !== 'critical') return 1
    return b.itcAtRisk - a.itcAtRisk
  })

  const totalItcAtRisk = urgentAlerts
    .filter(a => a.type === 'ITC_RISK')
    .reduce((s, a) => s + a.itcAtRisk, 0)

  const clientsNeedingAction = new Set(urgentAlerts.map(a => a.clientId)).size

  // Notification log for this CA
  const rawNotifications = await prisma.notification.findMany({
    where: { recipient_id: user.id },
    orderBy: { created_at: 'desc' },
    take: 20,
    select: {
      id: true,
      type: true,
      message: true,
      is_read: true,
      created_at: true,
    },
  })

  const notifications = rawNotifications.map(n => ({
    id: n.id,
    type: n.type as string,
    message: n.message,
    isRead: n.is_read,
    createdAt: n.created_at.toISOString(),
  }))

  return (
    <AlertsClient
      urgentAlerts={urgentAlerts}
      notifications={notifications}
      totalItcAtRisk={totalItcAtRisk}
      clientsNeedingAction={clientsNeedingAction}
      daysUntil14th={daysUntil14th}
    />
  )
}
