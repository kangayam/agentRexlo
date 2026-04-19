# Week 2 — Auth & Accounts Design

> Implements SPEC.md §5 Feature Group A. Covers CA sign-up, login, password reset, team invite, and org-level data isolation.

**Goal:** A CA can sign up, verify their email, invite staff, and log in. All API routes scope data to the caller's organisation. No CA firm can read another firm's data.

**Architecture:** Supabase Auth owns credentials and sessions. Our `users` table links each Supabase UUID to an org and role. API routes enforce isolation via a shared `getAuthedUser()` helper. Resend delivers email — configured as Supabase custom SMTP for OTP + reset, called directly for team invites.

**Tech Stack:** Next.js API Routes, Supabase Auth (`@supabase/ssr`), Prisma, Resend (`resend` npm package), `crypto` (built-in Node.js, for invite tokens)

---

## Section 1 — Architecture

Supabase Auth handles all credential storage and session tokens. The `middleware.ts` from Week 1 already refreshes tokens on every request. Our `users` table (schema already in place) links each `auth.users` UUID to an `Organization` and a `UserRole`.

**Resend usage — two modes:**
- **Supabase custom SMTP → Resend:** configured once in the Supabase dashboard. Covers OTP verification emails and password reset emails. No code required — Supabase sends these automatically.
- **Resend API (direct):** called from `lib/email/resend.ts` for team invite emails, which Supabase has no knowledge of.

**Org isolation:** a `getAuthedUser()` helper in `lib/auth/session.ts` returns the Prisma `User` record (including `org_id` and `role`) after validating the session via `supabase.auth.getUser()`. Every protected API route calls this once and scopes all Prisma queries to `org_id`. Enforced in code, not database RLS.

---

## Section 2 — Auth Flows

All auth actions go through `POST /api/auth` with an `action` discriminator field.

### Sign-up (two steps)

**Step 1 — Register:**
- `POST /api/auth` `{ action: "signup", email, password, firmName }`
- Calls `supabase.auth.signUp({ email, password })`
- Supabase sends a 6-digit OTP to the email (via Resend SMTP)
- Response: `{ step: "verify" }` — no org or user record created yet
- Client redirects to `/verify?email=...`

**Step 2 — Verify OTP:**
- `POST /api/auth` `{ action: "verify-otp", email, token }`
- Calls `supabase.auth.verifyOtp({ email, token, type: "signup" })`
- On success: create `Organization` (firmName) and `User` (id = Supabase UUID, role = `CA_ADMIN`) in Prisma within a transaction
- Redirect to `/ca/dashboard`

Org and user records are only created after the email is confirmed. This prevents orphaned org records from unverified sign-ups.

### Login

- `POST /api/auth` `{ action: "login", email, password }`
- Calls `supabase.auth.signInWithPassword({ email, password })`
- On success: look up `dbUser.role` from Prisma
  - `CA_ADMIN` or `CA_STAFF` → redirect to `/ca/dashboard`
  - `CLIENT` → redirect to `/client/dashboard`
- Supabase handles 5-failed-attempt lockout natively

### Password Reset (two steps)

**Step 1 — Request:**
- `POST /api/auth` `{ action: "reset-request", email }`
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: "/reset" })`
- Always responds 200 regardless of whether email exists (prevents email enumeration per SPEC)
- Supabase sends the reset link via Resend SMTP

**Step 2 — Confirm:**
- User arrives at `/reset` with Supabase's `access_token` in the URL fragment
- `POST /api/auth` `{ action: "reset-confirm", password }`
- Calls `supabase.auth.updateUser({ password })`
- Redirect to login

### New pages

- `app/(auth)/verify/page.tsx` — OTP entry form (email pre-filled from query param)
- `app/(auth)/reset/page.tsx` — updated to handle both request state (email form) and confirm state (new password form, shown when `access_token` present in URL)

---

## Section 3 — Team Invite Flow

Uses the existing `TeamInvite` Prisma model (no schema changes needed).

### Creating an invite

`POST /api/team` `{ action: "invite", email, role: "CA_STAFF" }`

1. Call `getAuthedUser()` — throw 403 if `dbUser.role !== 'CA_ADMIN'`
2. Generate token: `crypto.randomUUID()`
3. Persist to `team_invites`: `{ org_id, email, role, token, expires_at: now + 7 days }`
4. Call `sendTeamInviteEmail({ to: email, token, orgName })` via Resend API
5. Return the invite record

### Accepting an invite

User clicks link → `/accept-invite?token=xxx`

`POST /api/team` `{ action: "accept", token, name, password }`

1. Look up `team_invites` where `token` matches, `accepted_at IS NULL`, `expires_at > now()` — throw 400 if not found or expired
2. `supabase.auth.signUp({ email: invite.email, password })` — email is fixed from invite record, not user-supplied
3. Supabase sends OTP to invite email

`POST /api/team` `{ action: "accept-verify", token, otp }`

1. Re-fetch invite to get email
2. `supabase.auth.verifyOtp({ email: invite.email, token: otp, type: "signup" })`
3. On success: create `User` record `{ id: supabaseUser.id, org_id: invite.org_id, role: invite.role, name }`
4. Set `invite.accepted_at = now()` in Prisma
5. Redirect to `/ca/dashboard`

### Resend and revoke

- `POST /api/team` `{ action: "resend", inviteId }` — reset `expires_at` to now + 7 days, resend email
- `DELETE /api/team?inviteId=xxx` — delete invite record (revoke)
- Both require `CA_ADMIN` role

### Team management UI

`/ca/team` — list all pending and accepted team members for the org. Columns: name/email, role, status (Pending / Active), invited date, actions (Resend / Revoke for pending; Remove for active — remove sets `User.org_id` to null and deletes Supabase user via admin API).

---

## Section 4 — Org Isolation

### `getAuthedUser()` helper

```ts
// lib/auth/session.ts
export async function getAuthedUser() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  return dbUser
}
```

Returns the full Prisma `User` record, which includes `org_id` and `role`. Throws on unauthenticated or missing user record — Next.js catches and returns 401.

### Enforcement rules (applied to every protected route)

1. **Read:** every `findMany` / `findUnique` includes `org_id: dbUser.org_id` in `where`
2. **Write:** every `create` includes `org_id: dbUser.org_id` in `data`
3. **Role check:** admin-only actions (invite, remove team member) check `dbUser.role === 'CA_ADMIN'` and throw 403 otherwise

### Stub routes updated

`/api/clients`, `/api/upload`, `/api/reconciliation` stubs each get `getAuthedUser()` as their first line, replacing the current 501 placeholder. They remain stubs otherwise — the full implementations come in Weeks 3 and 4.

---

## File Map

**New files:**
- `lib/email/resend.ts` — Resend client, `sendTeamInviteEmail()`
- `app/(auth)/verify/page.tsx` — OTP entry UI
- `app/(auth)/accept-invite/page.tsx` — invite acceptance UI (two-step: set password → enter OTP)

**Modified files:**
- `lib/auth/session.ts` — add `getAuthedUser()`, keep `getSession()` for non-auth UI use
- `app/(auth)/reset/page.tsx` — handle both request and confirm states
- `app/ca/team/page.tsx` — real implementation (invite list + invite form)
- `app/api/auth/route.ts` — full implementation (signup, verify-otp, login, reset-request, reset-confirm)
- `app/api/team/route.ts` — new handler (invite, accept, accept-verify, resend, DELETE)
- `app/api/clients/route.ts` — add `getAuthedUser()` as first line
- `app/api/upload/route.ts` — add `getAuthedUser()` as first line
- `app/api/reconciliation/route.ts` — add `getAuthedUser()` as first line
- `package.json` — add `resend` package

**No schema changes** — `TeamInvite` model already exists in `prisma/schema.prisma`.

---

## Out of Scope (Week 2)

- Client invite flow — Week 3
- "Acting as client" mode — Week 3
- Email / WhatsApp notifications — Phase 2
- Firm logo upload — Week 8
