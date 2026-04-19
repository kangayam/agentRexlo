import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { getAuthedUser } from '@/lib/auth/session'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const dbUser = await getAuthedUser()
  if (!dbUser.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const { clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId, org_id: dbUser.org_id },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cookieStore = await cookies()
  cookieStore.set('actingAsClientId', clientId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  void params
  const cookieStore = await cookies()
  cookieStore.delete('actingAsClientId')
  return NextResponse.json({ ok: true })
}
