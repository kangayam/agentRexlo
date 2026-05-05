import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { deriveClientStatus, deriveQualityBand, sortCaRows } from '@/lib/dashboard/ca'
import type { CaClientRow } from '@/lib/dashboard/ca'
import Decimal from 'decimal.js'

export async function GET() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!user.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const clients = await prisma.client.findMany({
    where: { org_id: user.org_id },
    include: {
      gstins: {
        include: {
          upload_sessions: {
            where: { period: currentPeriod, status: 'DONE' },
            include: {
              ims_invoices: {
                include: {
                  reconciliation_result: {
                    select: { outcome: true, itc_at_risk: true, is_done: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const today = new Date()
  const daysUntil14th = 14 - today.getDate()
  const inPre14thWindow = daysUntil14th >= 1 && daysUntil14th <= 4

  const rows: CaClientRow[] = clients.map(client => {
    let itcAtRisk       = new Decimal(0)
    let itcLeakage      = new Decimal(0)
    let pendingActions  = 0
    let hasUpload       = false
    let totalInvoices   = 0
    let autoAccepted    = 0
    let nonAutoAccepted = 0
    let doneNonAuto     = 0

    for (const gstin of client.gstins) {
      for (const session of gstin.upload_sessions) {
        hasUpload = true
        for (const invoice of session.ims_invoices) {
          const result = invoice.reconciliation_result
          if (!result) continue
          totalInvoices++
          if (result.outcome === 'AUTO_ACCEPTED') {
            autoAccepted++
          } else {
            nonAutoAccepted++
            itcLeakage = itcLeakage.plus(new Decimal(result.itc_at_risk))
            if (result.is_done) {
              doneNonAuto++
            } else {
              itcAtRisk = itcAtRisk.plus(new Decimal(result.itc_at_risk))
              pendingActions++
            }
          }
        }
      }
    }

    const itcStr          = itcAtRisk.toFixed(2)
    const itcLeakageStr   = itcLeakage.toFixed(2)
    const autoAcceptRate  = totalInvoices > 0 ? autoAccepted / totalInvoices : 0
    const itcRecoveryRate = nonAutoAccepted > 0 ? doneNonAuto / nonAutoAccepted : 1
    const qualityScore    = hasUpload
      ? Math.round((autoAcceptRate * 50) + (itcRecoveryRate * 30) + (0.8 * 20))
      : 0

    return {
      clientId:      client.id,
      name:          client.name,
      gstinCount:    client.gstins.length,
      period:        hasUpload ? currentPeriod : null,
      itcAtRisk:     itcStr,
      itcLeakage:    itcLeakageStr,
      leakagePct:    0,
      qualityScore,
      qualityBand:   deriveQualityBand(qualityScore),
      daysUntil14th,
      pre14thAtRisk: inPre14thWindow ? itcStr : '0',
      scoreHistory:  [],
      pendingActions,
      status:        deriveClientStatus(pendingActions, itcStr, hasUpload),
    }
  })

  return NextResponse.json({ clients: sortCaRows(rows) })
}
