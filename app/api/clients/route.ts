export const dynamic = 'force-dynamic'


import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'

import { getAuthedUser } from '@/lib/auth/session'

import { sendClientInviteEmail } from '@/lib/email/resend'

import { UserRole } from '@prisma/client'

const GSTIN_REGEX = /^[A-Z0-9]{15}$/

export async function GET() {
  const dbUser = await getAuthedUser().catch(() => null)
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!dbUser.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const clients = await prisma.client.findMany({
    where: { org_id: dbUser.org_id },
    include: {
      gstins: { where: { is_primary: true } },
      users: { select: { id: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({
    clients: clients.map(c => {
      let status: 'active' | 'invited' | 'pending' = 'pending'
      if (c.users.length > 0) {
        status = 'active'
      } else if (c.invite_token && c.invite_expires_at && c.invite_expires_at > new Date()) {
        status = 'invited'
      }
      return {
        id: c.id,
        firmName: c.name,
        primaryGstin: c.gstins[0]?.gstin ?? '—',
        status,
        createdAt: c.created_at.toISOString(),
      }
    }),
  })
}

export async function POST(request: Request) {
  const dbUser = await getAuthedUser()
  if (!dbUser.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })
  if (dbUser.role !== UserRole.CA_ADMIN && dbUser.role !== UserRole.CA_STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { action } = body as { action: string }

  // ── Create new client ──────────────────────────────────────────────────────
  if (action === 'create') {
    const { firmName, primaryGstin, contactEmail, additionalGstins = [] } = body as {
      firmName:         string
      primaryGstin:     string
      contactEmail:     string
      additionalGstins?: string[]
    }

    if (!firmName?.trim())
      return NextResponse.json({ error: 'Firm name is required' }, { status: 400 })

    if (!GSTIN_REGEX.test(primaryGstin?.toUpperCase() ?? ''))
      return NextResponse.json(
        { error: 'Invalid primary GSTIN — must be 15 alphanumeric characters' },
        { status: 400 }
      )

    if (!Array.isArray(additionalGstins) || additionalGstins.length > 10)
      return NextResponse.json(
        { error: 'Maximum 10 additional GSTINs allowed' },
        { status: 400 }
      )

    // Validate each additional GSTIN format
    for (const g of additionalGstins) {
      if (!GSTIN_REGEX.test(g?.toUpperCase() ?? ''))
        return NextResponse.json(
          { error: `Invalid additional GSTIN "${g}" — must be 15 alphanumeric characters` },
          { status: 400 }
        )
    }

    const normalizedPrimary    = primaryGstin.toUpperCase()
    const normalizedAdditional = additionalGstins.map(g => g.toUpperCase())
    const allGstins            = [normalizedPrimary, ...normalizedAdditional]

    // Reject duplicates within submission
    const unique = new Set(allGstins)
    if (unique.size !== allGstins.length)
      return NextResponse.json(
        { error: 'Duplicate GSTINs in submission — each GSTIN must be unique' },
        { status: 400 }
      )

    // Check all GSTINs against existing records in one query
    const conflicts = await prisma.clientGstin.findMany({
      where: { gstin: { in: allGstins } },
      select: { gstin: true },
    })
    if (conflicts.length > 0) {
      const conflictList = conflicts.map(c => c.gstin).join(', ')
      return NextResponse.json(
        { error: `GSTIN${conflicts.length > 1 ? 's' : ''} already registered: ${conflictList}` },
        { status: 400 }
      )
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: dbUser.org_id },
      select: { name: true },
    })

    const inviteToken     = crypto.randomUUID()
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const client = await prisma.client.create({
      data: {
        org_id:            dbUser.org_id,
        name:              firmName.trim(),
        contact_email:     contactEmail.trim(),
        invite_token:      inviteToken,
        invite_expires_at: inviteExpiresAt,
        gstins: {
          create: [
            { gstin: normalizedPrimary, is_primary: true },
            ...normalizedAdditional.map(g => ({ gstin: g, is_primary: false })),
          ],
        },
      },
      include: { gstins: true },
    })

    try {
      await sendClientInviteEmail({ to: contactEmail.trim(), caOrgName: org.name, token: inviteToken })
    } catch (err) {
      await prisma.$transaction([
        prisma.clientGstin.deleteMany({ where: { client_id: client.id } }),
        prisma.client.delete({ where: { id: client.id } }),
      ])
      const message = err instanceof Error ? err.message : 'Failed to send invite email'
      return NextResponse.json({ error: `Email not sent: ${message}` }, { status: 500 })
    }

    return NextResponse.json({ client })
  }

  // ── Add secondary GSTIN ────────────────────────────────────────────────────
  if (action === 'add-gstin') {
    const { clientId, gstin } = body as { clientId: string; gstin: string }
    if (!GSTIN_REGEX.test(gstin?.toUpperCase() ?? '')) {
      return NextResponse.json({ error: 'Invalid GSTIN' }, { status: 400 })
    }
    const client = await prisma.client.findUnique({ where: { id: clientId, org_id: dbUser.org_id } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const existing = await prisma.clientGstin.findUnique({ where: { gstin: gstin.toUpperCase() } })
    if (existing) return NextResponse.json({ error: 'GSTIN already registered' }, { status: 400 })

    const newGstin = await prisma.clientGstin.create({
      data: { client_id: clientId, gstin: gstin.toUpperCase(), is_primary: false },
    })
    return NextResponse.json({ gstin: newGstin })
  }

  // ── Resend client invite ───────────────────────────────────────────────────
  if (action === 'resend-invite') {
    const { clientId } = body as { clientId: string }
    const client = await prisma.client.findUnique({ where: { id: clientId, org_id: dbUser.org_id } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: dbUser.org_id },
      select: { name: true },
    })

    const newToken = crypto.randomUUID()
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Save token first, then send email. Roll back if email fails.
    await prisma.client.update({
      where: { id: clientId },
      data: { invite_token: newToken, invite_expires_at: newExpiry },
    })

    try {
      await sendClientInviteEmail({ to: client.contact_email, caOrgName: org.name, token: newToken })
    } catch (err) {
      // Roll back token so the CA can retry
      await prisma.client.update({
        where: { id: clientId },
        data: { invite_token: null, invite_expires_at: null },
      })
      const message = err instanceof Error ? err.message : 'Failed to send invite email'
      return NextResponse.json({ error: `Email not sent: ${message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
