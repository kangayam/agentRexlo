import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ message: 'clients API — not yet implemented' }, { status: 501 })
}
