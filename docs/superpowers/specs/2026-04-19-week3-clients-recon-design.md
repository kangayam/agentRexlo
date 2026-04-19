# Week 3 — Client Management + Reconciliation Engine Design

**Date:** 2026-04-19  
**Scope:** Sub-projects A (client management) + B (reconciliation engine). Upload flow and dashboards are Week 4.

---

## Goal

A CA can add clients (with GSTINs), invite client users, act on behalf of a client, and the reconciliation engine can process IMS JSON + Tally CSV into a typed result array — fully tested against the golden fixtures.

---

## Architecture

### Client org model

Clients have their own separate organization (`ClientOrg`) distinct from the CA's `Organization`. This means:
- Client data (GSTINs, uploads, results) belongs to the client, not the CA firm
- A client can theoretically switch CA firms without losing their data
- Row-level security follows the same `org_id` pattern already in place
- The `Client` Prisma model is the join table linking a CA org to a client org

```
CA Organization ──< Client >── ClientOrg
                                  │
                             Gstin[], User[]
                             (future: Upload[], ReconResult[])
```

### Reconciliation engine

Pure TypeScript functions — no Prisma, no HTTP. Data flows in, `ReconResult[]` flows out. The API layer (Week 4) is responsible for persisting results. This keeps the engine fully unit-testable with just the fixture files.

---

## Data Model (Prisma additions)

```prisma
model ClientOrg {
  id         String   @id @default(uuid())
  name       String
  created_at DateTime @default(now())

  gstins  Gstin[]
  users   User[]         // role: CLIENT
  clients Client[]       // CA relationships
  invites ClientInvite[]
}

model Gstin {
  id            String    @id @default(uuid())
  gstin         String    @unique
  client_org_id String
  is_primary    Boolean   @default(false)
  created_at    DateTime  @default(now())

  client_org ClientOrg @relation(fields: [client_org_id], references: [id])
}

model Client {
  id             String   @id @default(uuid())
  ca_org_id      String
  client_org_id  String
  invited_by_id  String
  created_at     DateTime @default(now())

  ca_org     Organization @relation(fields: [ca_org_id], references: [id])
  client_org ClientOrg    @relation(fields: [client_org_id], references: [id])
  invited_by User         @relation(fields: [invited_by_id], references: [id])
}

model ClientInvite {
  id             String    @id @default(uuid())
  token          String    @unique @default(uuid())
  email          String
  client_org_id  String
  invited_by_id  String
  accepted_at    DateTime?
  expires_at     DateTime
  created_at     DateTime  @default(now())

  client_org ClientOrg @relation(fields: [client_org_id], references: [id])
  invited_by User      @relation(fields: [invited_by_id], references: [id])
}
```

Existing `User` model is unchanged. For `CLIENT` role users, `org_id` points to their `ClientOrg.id` — the same field, different target model. Role differentiates which org type `org_id` references. No new column needed on `User`.

---

## API Routes

### `GET /api/clients`
Returns all clients linked to the CA's org via the `Client` join table.

Response:
```ts
{
  clients: Array<{
    id: string          // Client join record id
    clientOrgId: string
    firmName: string
    primaryGstin: string
    status: 'active' | 'invited' | 'pending'
    createdAt: string
  }>
}
```

### `POST /api/clients`

**`action: "create"`** — CA_ADMIN or CA_STAFF creates a new client:
- Body: `{ firmName, primaryGstin, contactEmail }`
- Validates GSTIN: 15-char alphanumeric, uppercase
- Creates: `ClientOrg`, `Gstin` (primary), `Client` (join), `ClientInvite`
- Sends invite email via Resend
- Returns: `{ client, invite }`

**`action: "add-gstin"`** — Add a secondary GSTIN to an existing client:
- Body: `{ clientOrgId, gstin }`
- CA must own the client (verified via `Client` join table)
- Creates: `Gstin` record
- Returns: `{ gstin }`

**`action: "resend-invite"`** — Resend the client invite email:
- Body: `{ inviteId }`
- Resets `expires_at` to 7 days from now
- Resends invite email
- Returns: `{ ok: true }`

### `GET /api/clients/[clientId]`

Returns full detail for a single client (CA must own via `Client` join):
```ts
{
  firmName: string
  gstins: Array<{ id, gstin, is_primary }>
  users: Array<{ id, name, email, created_at }>
  invites: Array<{ id, email, expires_at, accepted_at }>
}
```

### `POST /api/clients/[clientId]/acting-as`

Sets a server-side cookie `actingAsClientId = clientOrgId`. CA must own the client. Returns `{ ok: true }`.

### `DELETE /api/clients/[clientId]/acting-as`

Clears the `actingAsClientId` cookie. Returns `{ ok: true }`.

---

## Client Invite Flow

Reuses the existing pattern from team invites:

1. CA creates client → `ClientInvite` record + Resend email to `contactEmail`
2. Client clicks invite link → `/accept-client-invite?token=xxx`
3. Client enters name + password → `POST /api/clients/accept-invite` → Supabase `signUp()` with metadata `{ name, clientInviteToken: token }`
4. Supabase sends confirmation email → client clicks link → `/auth/callback`
5. Callback checks metadata: if `clientInviteToken` present → creates `User` with `role: CLIENT`, linked to `client_org_id` from the invite → marks invite `accepted_at`
6. Redirects to `/client/dashboard`

---

## Acting-as Mode

When a CA clicks "Act as Client" on `/ca/clients/[clientId]`:
- `POST /api/clients/[clientId]/acting-as` sets cookie `actingAsClientId`
- CA is redirected to `/client/dashboard`
- All `/client/*` pages and `/api/*` routes check for `actingAsClientId` cookie
- A sticky banner shows: **"Acting as [Firm Name]"** with an **Exit** button
- Exit calls `DELETE /api/clients/[clientId]/acting-as`, clears cookie, redirects to `/ca/clients`

The `getAuthedUser()` helper is extended with a `getEffectiveClientOrg()` helper that returns:
- The `actingAsClientId` org if the CA has the cookie and owns the client
- The user's own `client_org_id` if they are a `CLIENT` user

---

## Reconciliation Engine

### File structure

```
lib/
  parsers/
    ims-json-parser.ts       — parseImsJson(json: string) → NormalizedImsInvoice[]
    tally-csv-parser.ts      — parseTallyCsv(csv: string) → NormalizedTallyRow[]
  reconciliation/
    normalize.ts             — normalizeGstin(), normalizeInvoiceNum(), normalizeDate(), normalizeValue()
    matcher.ts               — findCandidates(ims, tallyIndex) → TallyRow | null
    rules.ts                 — classify(ims, tally | null) → ReconResult
    reasons.ts               — reason templates as pure functions
    index.ts                 — reconcile(ims[], tally[]) → ReconResult[]
```

### Key types

```ts
// lib/parsers/ims-json-parser.ts
interface NormalizedImsInvoice {
  supplierGstin: string      // raw from ctin
  invoiceNum: string         // raw from inum
  invoiceDate: string        // ISO 8601
  totalValue: Decimal
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  pos: string                // place of supply
}

// lib/parsers/tally-csv-parser.ts
interface NormalizedTallyRow {
  supplierGstin: string
  supplierName: string
  invoiceNum: string         // raw
  invoiceDate: string        // ISO 8601
  taxableValue: Decimal
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  totalAmount: Decimal
}

// lib/reconciliation/index.ts
type ReconOutcome = 'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'

interface ReconResult {
  imsInvoiceId: string           // `${supplierGstin}::${invoiceNum}`
  imsGstin: string
  imsInvoiceNum: string          // raw
  imsValue: Decimal
  imsDate: string
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  itcAtRisk: Decimal             // igst+cgst+sgst for non-AUTO_ACCEPTED; 0 for AUTO_ACCEPTED
  result: ReconOutcome
  reason: string | null          // null for AUTO_ACCEPTED
  matchedTallyInvoiceNum: string | null
}
```

### Engine logic (SPEC §10)

`reconcile(imsInvoices, tallyRows)`:

1. **Normalize** all inputs (both sides)
2. **Build Tally index:** `Map<normalizedInvoiceNum, TallyRow[]>` for Strategy A; flat array for Strategy B
3. **Detect IMS duplicates:** same normalized invoice# + same supplier → both marked `AUTO_REJECTED` ("Duplicate IMS entry")
4. **For each remaining IMS invoice:**
   - Strategy A: look up normalized invoice# in Tally index
   - Strategy B: find Tally rows with same GSTIN + value within 2% + same tax type
   - If no candidates → `NOT_IN_BOOKS`
   - Pick best candidate (smallest value delta, then closest date)
   - Run cascade: GSTIN check → value delta → soft invoice# → tax type → date gap → clean pass
5. Return `ReconResult[]` (one per IMS invoice including duplicates)

### Testing

`tests/reconciliation.test.ts`:
- **Golden fixture test:** reads real fixture files, calls `reconcile()`, asserts all 47 rows match expected CSV
- **9 per-scenario unit tests:** one per scenario (EXACT_MATCH, WRONG_GSTIN, NOT_IN_BOOKS, VALUE_OVER_10, VALUE_MISMATCH_2_10, FORMAT_VARIATION, INVOICE_NUMBER_MISMATCH, DATE_GAP, DUPLICATE)
- **Parser tests:** `tests/parsers.test.ts` — unit tests for `parseImsJson` and `parseTallyCsv`
- **Normalize tests:** `tests/normalize.test.ts` — unit tests for each normalize function

---

## Pages

### `/ca/clients` — Client list
- Table: firm name, primary GSTIN, status badge, created date
- "Add Client" inline form: firm name, primary GSTIN (validated), contact email
- Error shown inline if Resend fails or GSTIN invalid

### `/ca/clients/[clientId]` — Client detail
- Firm name, GSTINs list with "Add GSTIN" button
- Active users list
- Pending invites with Resend/Revoke actions
- "Act as Client" button

### `/accept-client-invite` — Client onboarding
- Same single-step pattern as `/accept-invite` (name + password → check email)
- Reads `?token=` from URL

### Acting-as banner
- Component: `components/acting-as-banner.tsx`
- Shown on all `/client/*` pages when `actingAsClientId` cookie is present
- Shows firm name fetched from the cookie's org
- Exit button calls DELETE API + redirects

---

## What is NOT in Week 3

- File upload (Week 4)
- Persisting recon results to DB (Week 4)
- Client dashboard / action queue (Week 4)
- CA multi-client dashboard with ITC totals (Week 4)
- Mark Done on GSTN tracking (Week 4)
- Logout button (Week 4)
