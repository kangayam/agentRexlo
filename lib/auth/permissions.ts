type UserRole = 'CA_ADMIN' | 'CA_STAFF' | 'CLIENT'

export function isCAAdmin(role: UserRole): boolean {
  return role === 'CA_ADMIN'
}

export function isCAMember(role: UserRole): boolean {
  return role === 'CA_ADMIN' || role === 'CA_STAFF'
}

export function canActAsClient(role: UserRole): boolean {
  return role === 'CA_ADMIN' || role === 'CA_STAFF'
}
