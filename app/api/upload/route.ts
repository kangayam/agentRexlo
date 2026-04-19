import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'

export async function POST() {
  await getAuthedUser()
  return NextResponse.json({ message: 'upload API — not yet implemented' }, { status: 501 })
}
