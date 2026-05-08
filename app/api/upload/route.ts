export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'

import { getAuthedUser } from '@/lib/auth/session'

import { prisma } from '@/lib/db/prisma'

import { parseIMSJson } from '@/lib/parsers/ims-json-parser'

import { parseTallyCsv } from '@/lib/parsers/tally-csv-parser'

import { parseTallyFile } from '@/lib/parsers/tally-excel-parser'

import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'

import { uploadFile } from '@/lib/storage/index'

import { runReconciliation } from '@/lib/reconciliation/run'

import { sendNotification } from '@/lib/notifications/index'

import { replaceImsInvoices } from '@/lib/upload/ims'

// ─── GET /api/upload?clientGstinId=xxx&period=YYYY-MM ────────────────────────

export async function GET(req: NextRequest) {
  try {
    await getAuthedUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const clientGstinId = searchParams.get('clientGstinId')
  const period = searchParams.get('period')

  if (!clientGstinId || !period) {
    return NextResponse.json(
      { error: 'clientGstinId and period are required' },
      { status: 400 }
    )
  }

  const session = await prisma.uploadSession.findUnique({
    where: { client_gstin_id_period: { client_gstin_id: clientGstinId, period } },
    include: {
      _count: {
        select: {
          ims_invoices: true,
          tally_entries: true,
        },
      },
    },
  })

  if (!session) {
    return NextResponse.json({
      sessionId: null,
      status: null,
      imsUploadedAt: null,
      imsCount: 0,
      tallyUploadedAt: null,
      tallyCount: 0,
    })
  }

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    imsUploadedAt: session.ims_uploaded_at,
    imsCount: session._count.ims_invoices,
    tallyUploadedAt: session.tally_uploaded_at,
    tallyCount: session._count.tally_entries,
  })
}

// ─── POST /api/upload ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Auth: CA (admin or staff) or linked client
  if (
    user.role !== 'CA_ADMIN' &&
    user.role !== 'CA_STAFF' &&
    user.role !== 'CLIENT'
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null
  const clientGstinId = formData.get('clientGstinId') as string | null
  const period = formData.get('period') as string | null
  const columnMappingRaw = formData.get('columnMapping') as string | null

  if (!file || !type || !clientGstinId || !period) {
    return NextResponse.json(
      { error: 'file, type, clientGstinId, and period are required' },
      { status: 400 }
    )
  }

  if (type !== 'ims' && type !== 'tally') {
    return NextResponse.json({ error: 'type must be "ims" or "tally"' }, { status: 400 })
  }

  // Look up ClientGstin (include client for org_id)
  const clientGstin = await prisma.clientGstin.findUnique({
    where: { id: clientGstinId },
    include: { client: true },
  })

  if (!clientGstin) {
    return NextResponse.json({ error: 'ClientGstin not found' }, { status: 404 })
  }

  const clientId = clientGstin.client_id
  const orgId = clientGstin.client.org_id

  // CLIENT role: verify the user is linked to this client
  if (user.role === 'CLIENT' && user.client_id !== clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // CA roles: verify they belong to the same org
  if (
    (user.role === 'CA_ADMIN' || user.role === 'CA_STAFF') &&
    user.org_id !== orgId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Upsert UploadSession for (clientGstinId, period)
  let session = await prisma.uploadSession.upsert({
    where: { client_gstin_id_period: { client_gstin_id: clientGstinId, period } },
    create: {
      client_gstin_id: clientGstinId,
      period,
      status: 'PENDING',
      uploaded_by_id: user.id,
    },
    update: {},
  })

  // Convert file to Buffer
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${orgId}/${clientId}/${period}/${type}.${ext}`

  // Non-blocking storage save
  uploadFile(storagePath, fileBuffer, file.type).catch(err =>
    console.error('[storage] upload failed:', err)
  )

  const fileUrl = storagePath

  if (type === 'ims') {
    // Parse IMS JSON — format-agnostic
    let rawJson: unknown
    try {
      rawJson = JSON.parse(fileBuffer.toString('utf-8'))
    } catch {
      return NextResponse.json(
        { error: 'File is not valid JSON. Please download a fresh export from GSTN → IMS tab → Export JSON.' },
        { status: 422 }
      )
    }

    let parsedFile: Awaited<ReturnType<typeof parseIMSJson>>
    try {
      parsedFile = parseIMSJson(rawJson)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to parse IMS JSON' },
        { status: 422 }
      )
    }

    // Replace-all: delete existing IMS records (and their recon results) then insert fresh
    await replaceImsInvoices(session.id, parsedFile.invoices)

    // Update session: ims_uploaded_at, ims_file_url, status
    session = await prisma.uploadSession.update({
      where: { id: session.id },
      data: {
        ims_uploaded_at: new Date(),
        ims_file_url: fileUrl,
        status: 'PROCESSING',
      },
    })
  } else {
    // Tally path
    let columnMap: TallyColumnMap | undefined
    if (columnMappingRaw) {
      try {
        columnMap = JSON.parse(columnMappingRaw) as TallyColumnMap
      } catch {
        return NextResponse.json({ error: 'Invalid columnMapping JSON' }, { status: 400 })
      }
    }

    const fileExt = ext.toLowerCase()
    let parsed: Awaited<ReturnType<typeof parseTallyCsv>>

    try {
      if (fileExt === 'csv') {
        const csvText = fileBuffer.toString('utf-8')
        parsed = parseTallyCsv(csvText, columnMap)
      } else {
        // xlsx / xls
        parsed = parseTallyFile(fileBuffer.buffer as ArrayBuffer, columnMap)
      }
    } catch (err) {
      return NextResponse.json({ error: 'Failed to parse Tally file', detail: String(err) }, { status: 422 })
    }

    // Replace-all: delete existing TallyEntry rows for this session, then createMany
    await prisma.tallyEntry.deleteMany({
      where: { upload_session_id: session.id },
    })

    if (parsed.length > 0) {
      await prisma.tallyEntry.createMany({
        data: parsed.map(row => ({
          upload_session_id: session.id,
          supplier_name: row.supplierName,
          supplier_gstin: row.supplierGstin,
          voucher_number: row.invoiceNum,
          voucher_date: new Date(row.invoiceDate),
          total_amount: row.totalAmount.toFixed(2),
          taxable_value: row.taxableValue.toFixed(2),
          igst: row.igst.toFixed(2),
          cgst: row.cgst.toFixed(2),
          sgst: row.sgst.toFixed(2),
        })),
      })
    }

    // Update session: tally_uploaded_at, tally_file_url, status
    session = await prisma.uploadSession.update({
      where: { id: session.id },
      data: {
        tally_uploaded_at: new Date(),
        tally_file_url: fileUrl,
        status: 'PROCESSING',
      },
    })
  }

  // Reload session to get latest timestamps
  const reloadedSession = await prisma.uploadSession.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      _count: {
        select: {
          ims_invoices: true,
          tally_entries: true,
        },
      },
    },
  })

  let reconOutcomes: Awaited<ReturnType<typeof runReconciliation>> | undefined

  // If both IMS and Tally are uploaded, run reconciliation
  if (reloadedSession.ims_uploaded_at && reloadedSession.tally_uploaded_at) {
    try {
      reconOutcomes = await runReconciliation(reloadedSession.id)

      // Notify all CA org members
      const caUsers = await prisma.user.findMany({
        where: {
          org_id: orgId,
          role: { in: ['CA_ADMIN', 'CA_STAFF'] },
        },
        select: { id: true },
      })

      await Promise.allSettled(
        caUsers.map(caUser =>
          sendNotification({
            recipientId: caUser.id,
            senderId: user.id,
            clientId,
            type: 'CLIENT_UPLOADED',
            message: `Reconciliation complete for period ${period}. ${reconOutcomes!.AUTO_ACCEPTED} auto-accepted, ${reconOutcomes!.AUTO_REJECTED} auto-rejected, ${reconOutcomes!.PENDING_REVIEW} pending review.`,
          })
        )
      )
    } catch (err) {
      console.error('[reconciliation] runReconciliation failed:', err)
    }
  }

  // Re-fetch after recon so status reflects DONE (recon updates status in DB)
  const finalSession = reconOutcomes
    ? await prisma.uploadSession.findUniqueOrThrow({
        where: { id: session.id },
        include: { _count: { select: { ims_invoices: true, tally_entries: true } } },
      })
    : reloadedSession

  return NextResponse.json({
    sessionId:       finalSession.id,
    status:          finalSession.status,
    imsUploadedAt:   finalSession.ims_uploaded_at?.toISOString() ?? null,
    imsCount:        finalSession._count.ims_invoices,
    tallyUploadedAt: finalSession.tally_uploaded_at?.toISOString() ?? null,
    tallyCount:      finalSession._count.tally_entries,
    ...(reconOutcomes ? { reconOutcomes } : {}),
  })
}
