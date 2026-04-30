import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'

export default async function Home() {
  let user: Awaited<ReturnType<typeof getAuthedUser>> | null = null
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
  }

  if (user?.role === 'CLIENT') redirect('/client/dashboard')
  redirect('/ca/dashboard')
}
