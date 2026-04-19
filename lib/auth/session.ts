import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'

export async function getSession() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function requireAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

export async function getAuthedUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  return dbUser
}
