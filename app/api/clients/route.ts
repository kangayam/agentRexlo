import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'

export async function GET() {
  await getAuthedUser()
  return NextResponse.json({ message: 'clients API — not yet implemented' }, { status: 501 })
}
