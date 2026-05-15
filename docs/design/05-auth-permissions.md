# Auth & Permissions
**Type:** Low-Level Design (LLD)  
**Audience:** Developers + CA firm partners  
**Last updated:** 2026-05-15  
**Source files:** `lib/auth/session.ts`, `lib/auth/permissions.ts`, `lib/auth/invite.ts`, `middleware.ts`

---

## What It Does (Plain English)

AgentGST has two types of users — CA firm staff and their clients — who log into the same application but see completely different screens. A CA sees all their clients' data. A client sees only their own data. Within the CA firm, admins have additional powers (archiving, deleting clients) that staff members don't.

Authentication uses **Supabase Auth** (email + password). Authorisation is enforced in code — every API route checks the caller's role before returning data.

---

## Roles

| Role | Who | Access level |
|---|---|---|
| `CA_ADMIN` | Senior CA / firm partner | Full access: all clients, archival, deletion, team management |
| `CA_STAFF` | Junior CA / team member | Read and write access to clients; cannot archive, delete, or manage team |
| `CLIENT` | Business owner / accountant at a client firm | Own data only: dashboard, upload, history |

Roles are stored in the `users` table as a `UserRole` enum. A user's role is set at registration (CA users) or invitation (client users) and can only be changed by a CA_ADMIN via the Team page.

---

## Permission Matrix

| Action | CA_ADMIN | CA_STAFF | CLIENT |
|---|---|---|---|
| View client list | ✓ | ✓ | — |
| View client detail (any client) | ✓ | ✓ | — |
| View own client detail | — | — | ✓ |
| Add new client | ✓ | ✓ | — |
| Upload files for client | ✓ | ✓ | ✓ (own only) |
| Send reminder to client | ✓ | ✓ | — |
| Mark reconciliation items Done | ✓ | ✓ | — |
| Archive client | ✓ | — | — |
| Restore archived client | ✓ | — | — |
| Permanently delete client | ✓ | — | — |
| Act as client (impersonate) | ✓ | ✓ | — |
| Manage team members | ✓ | — | — |
| Invite team members | ✓ | — | — |
| View notifications | ✓ | ✓ | ✓ (own only) |

---

## Session Handling

**Provider:** Supabase Auth  
**Method:** Email + password  
**Session storage:** HTTP-only cookies (managed by Supabase)

```ts
// lib/auth/session.ts

// Get the current authenticated user from DB (throws if not logged in)
export async function getAuthedUser(): Promise<User>

// Get just the Supabase session (lighter — for middleware)
export async function getSession(): Promise<Session | null>

// Get the client ID the CA is currently acting as
export async function getEffectiveClientId(): Promise<string | null>
```

`getAuthedUser()` makes two calls: one to Supabase Auth to get the user ID, then one to Prisma to get the full `User` record including `role`, `org_id`, and `client_id`. This is used by every API route.

---

## Route Protection (Middleware)

`middleware.ts` runs on every request before the page or API route handler. It:
1. Checks for a valid Supabase session cookie
2. Redirects unauthenticated requests to `/login`
3. Redirects authenticated users away from auth pages (login, signup) to their dashboard

CA routes (`/ca/*`) and client routes (`/client/*`) are both protected. Role enforcement (CA vs CLIENT) happens inside each route handler, not in middleware.

---

## Client Invitation Flow

Clients do not self-register. They are invited by a CA firm.

```
CA creates client record (firm name, GSTIN, contact email)
      ↓
System generates invite token (UUID) with 7-day expiry
      ↓
Invite email sent via Resend (contains link with token)
      ↓
Client clicks link → /accept-client-invite?token=xxx
      ↓
Client sets their password
      ↓
Supabase Auth account created
      ↓
User record created: role=CLIENT, client_id=<clientId>
      ↓
Client redirected to /client/dashboard
```

The invite token is single-use and expires after 7 days. CAs can resend from the client detail page.

---

## Team Member Invitation Flow

CA_ADMIN can invite colleagues to join the firm as CA_STAFF.

```
CA_ADMIN enters email on /ca/team page
      ↓
TeamInvite record created with token + 7-day expiry
      ↓
Invite email sent via Resend
      ↓
Colleague clicks link → /accept-invite?token=xxx
      ↓
Colleague sets password, Supabase Auth account created
      ↓
User record created: role=CA_STAFF, org_id=<orgId>
```

---

## Act as Client (Impersonation)

CA staff can view the portal from a client's perspective to troubleshoot or assist. This does not create a new session — it sets a cookie `actingAsClientId` that causes `getEffectiveClientId()` to return the client's ID instead of null.

```ts
// Set by POST /api/clients/[clientId]/acting-as
// Cleared by DELETE /api/clients/acting-as or on browser close
```

When acting as a client, a banner appears at the top of every page: "Acting as [Client Name]" with an Exit button.

---

## Data Isolation

All API routes enforce org-level isolation in code. There is no database-level RLS enforced via PostgREST (the app does not use the Supabase Data API). Every Prisma query that returns client data includes a `org_id` filter matching the caller's org:

```ts
// Example pattern used in every CA API route
const client = await prisma.client.findFirst({
  where: { id: clientId, org_id: user.org_id }
})
if (!client) return 404
```

This ensures a CA from Firm A cannot access Firm B's clients even if they know a client ID.
