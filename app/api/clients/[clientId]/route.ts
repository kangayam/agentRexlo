import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthedUser } from '@/lib/auth/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const dbUser = await getAuthedUser()
  if (!dbUser.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const { clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId, org_id: dbUser.org_id },
    include: {
      gstins: { orderBy: { is_primary: 'desc' } },
      users: { select: { id: true, name: true, email: true, created_at: true } },
    },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    firmName: client.name,
    contactEmail: client.contact_email,
    gstins: client.gstins.map(g => ({ id: g.id, gstin: g.gstin, is_primary: g.is_primary })),
    users: client.users,
    invite: client.invite_token
      ? {
          token: client.invite_token,
          email: client.contact_email,
          expires_at: client.invite_expires_at?.toISOString() ?? null,
        }
      : null,
  })
}
