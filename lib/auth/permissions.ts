import { UserRole } from '@prisma/client'

export function isCAAdmin(role: UserRole): boolean {
  return role === 'CA_ADMIN'
}

export function isCAMember(role: UserRole): boolean {
  return role === 'CA_ADMIN' || role === 'CA_STAFF'
}

export function canActAsClient(role: UserRole): boolean {
  return role === 'CA_ADMIN' || role === 'CA_STAFF'
}
