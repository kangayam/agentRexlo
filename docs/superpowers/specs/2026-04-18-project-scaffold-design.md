# AgentFlow Core — Week 1 Project Scaffold Design

**Date:** 2026-04-18
**Scope:** Initialize Next.js 14 App Router project with TypeScript, Tailwind, shadcn/ui, Prisma, Supabase. Write full Prisma schema (SPEC.md §9) and seed script (SPEC.md §12).
**Approach:** A — `create-next-app` + manual wiring

---

## 1. Project Setup

### Bootstrap

```bash
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

No `src/` directory — all folders live at root per SPEC.md §7.

### Packages to install

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Prisma
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql

# shadcn/ui
npx shadcn-ui@latest init   # base: slate, CSS variables: yes

# Domain libs
npm install decimal.js papaparse xlsx
npm install -D @types/papaparse
```

### Environment variables

`.env.example` (committed). `.env.local` (gitignored, filled in by developer).

```env
# Prisma — Supabase connection pooler URL (port 6543) for runtime queries
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Prisma — direct URL (port 5432) for migrations
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Supabase client (browser-safe)
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase service role (server-only, never expose to browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### `package.json` scripts

```json
"db:migrate": "prisma migrate dev",
"db:seed":    "tsx prisma/seed.ts",
"db:studio":  "prisma studio",
"db:generate":"prisma generate"
```

---

## 2. Supabase Auth Integration Pattern

Supabase owns `auth.users` (internal — Prisma never touches it).

Our `public.users` table (managed by Prisma) uses the same UUID as its primary key. A Supabase database trigger (`handle_new_user`) fires on `auth.users` insert and creates the matching row in `public.users` with `role = CLIENT` by default (overridden during onboarding API calls).

Server-side auth uses `@supabase/ssr` with cookie-based session handling — required for Next.js App Router server components and middleware.

Two Supabase client helpers:
- `lib/supabase/server.ts` — `createServerClient()` for Server Components and API routes
- `lib/supabase/client.ts` — `createBrowserClient()` for Client Components

---

## 3. Folder Structure

Exactly as SPEC.md §7. Stub files created for every leaf directory so the structure is navigable from day one.

```
app/
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  (auth)/reset/page.tsx
  ca/dashboard/page.tsx
  ca/clients/page.tsx
  ca/team/page.tsx
  client/dashboard/page.tsx
  client/upload/page.tsx
  client/history/page.tsx
  api/auth/route.ts
  api/clients/route.ts
  api/upload/route.ts
  api/reconciliation/route.ts

lib/
  supabase/server.ts
  supabase/client.ts
  auth/session.ts
  auth/permissions.ts
  parsers/ims-json-parser.ts
  parsers/tally-excel-parser.ts
  reconciliation/normalize.ts
  reconciliation/matcher.ts
  reconciliation/rules.ts
  reconciliation/reasons.ts
  notifications/in-platform.ts
  notifications/index.ts
  storage/index.ts
  db/prisma.ts

components/
  ui/                  (shadcn/ui output)
  dashboard/
  upload/
  tables/

prisma/
  schema.prisma
  seed.ts

tests/
data/
  sample-ims.json
  sample-tally.csv
  sample-tally-variant.csv
```

---

## 4. Prisma Schema

### Enums

```prisma
enum UserRole {
  CA_ADMIN
  CA_STAFF
  CLIENT
}

enum UploadStatus {
  PENDING
  PROCESSING
  DONE
  ERROR
}

enum ImsAction {
  ACCEPTED
  REJECTED
  PENDING
}

enum MatchLevel {
  EXACT
  VALUE_TOLERANCE
  SOFT_INVOICE
  NO_MATCH
}

enum ReconciliationOutcome {
  AUTO_ACCEPTED
  AUTO_REJECTED
  PENDING_REVIEW
  NOT_IN_BOOKS
}

enum NotificationType {
  CA_NOTIFY_CLIENT
  CLIENT_COMPLETED
  CLIENT_UPLOADED
  UPLOAD_FAILED
}
```

### Models

```prisma
model Organization {
  id         String   @id @default(uuid())
  name       String
  logo_url   String?
  created_at DateTime @default(now())

  users       User[]
  clients     Client[]
  team_invites TeamInvite[]
}

model User {
  id         String   @id                    // matches Supabase auth.users.id
  name       String
  email      String   @unique
  role       UserRole
  org_id     String?
  client_id  String?
  created_at DateTime @default(now())

  org    Organization? @relation(fields: [org_id], references: [id])
  client Client?       @relation(fields: [client_id], references: [id])

  upload_sessions        UploadSession[]
  team_invites_sent      TeamInvite[]           @relation("InvitedBy")
  reconciliation_done    ReconciliationResult[] @relation("DoneBy")
  notifications_received Notification[]        @relation("Recipient")
  notifications_sent    Notification[]         @relation("Sender")
  audit_logs            AuditLog[]
}

model TeamInvite {
  id           String    @id @default(uuid())
  org_id       String
  email        String
  role         UserRole
  token        String    @unique @default(uuid())
  expires_at   DateTime
  accepted_at  DateTime?
  invited_by_id String
  created_at   DateTime  @default(now())

  org        Organization @relation(fields: [org_id], references: [id])
  invited_by User         @relation("InvitedBy", fields: [invited_by_id], references: [id])
}

model Client {
  id                  String    @id @default(uuid())
  org_id              String
  name                String
  contact_email       String
  invite_token        String?   @unique
  invite_expires_at   DateTime?
  created_at          DateTime  @default(now())

  org      Organization  @relation(fields: [org_id], references: [id])
  gstins   ClientGstin[]
  users    User[]
  notifications Notification[]
}

model ClientGstin {
  id         String   @id @default(uuid())
  client_id  String
  gstin      String   @unique
  is_primary Boolean  @default(false)
  created_at DateTime @default(now())

  client          Client          @relation(fields: [client_id], references: [id])
  upload_sessions UploadSession[]
}

model UploadSession {
  id                 String       @id @default(uuid())
  client_gstin_id    String
  period             String                         // "2026-01"
  ims_uploaded_at    DateTime?
  ims_file_url       String?
  tally_uploaded_at  DateTime?
  tally_file_url     String?
  uploaded_by_id     String
  status             UploadStatus @default(PENDING)
  created_at         DateTime     @default(now())

  client_gstin  ClientGstin   @relation(fields: [client_gstin_id], references: [id])
  uploaded_by   User          @relation(fields: [uploaded_by_id], references: [id])
  ims_invoices  ImsInvoice[]
  tally_entries TallyEntry[]

  @@unique([client_gstin_id, period])
}

model ImsInvoice {
  id                String    @id @default(uuid())
  upload_session_id String
  supplier_gstin    String
  supplier_name     String?
  invoice_number    String
  invoice_date      DateTime
  invoice_value     String                        // Decimal stored as String
  taxable_value     String
  igst              String
  cgst              String
  sgst              String
  ims_action        ImsAction @default(PENDING)
  place_of_supply   String?
  hsn_code          String?
  created_at        DateTime  @default(now())

  upload_session        UploadSession          @relation(fields: [upload_session_id], references: [id])
  reconciliation_result ReconciliationResult?
}

model TallyEntry {
  id                String   @id @default(uuid())
  upload_session_id String
  supplier_name     String
  supplier_gstin    String
  voucher_number    String
  voucher_date      DateTime
  total_amount      String
  taxable_value     String
  igst              String
  cgst              String
  sgst              String
  hsn_code          String?
  created_at        DateTime @default(now())

  upload_session        UploadSession          @relation(fields: [upload_session_id], references: [id])
  reconciliation_results ReconciliationResult[]
}

model ReconciliationResult {
  id             String                @id @default(uuid())
  ims_invoice_id String                @unique
  tally_entry_id String?
  match_level    MatchLevel
  outcome        ReconciliationOutcome
  reason_code    String
  reason_text    String
  itc_at_risk    String                // Decimal stored as String
  is_done        Boolean               @default(false)
  done_at        DateTime?
  done_by_id     String?
  created_at     DateTime              @default(now())
  updated_at     DateTime              @updatedAt

  ims_invoice  ImsInvoice   @relation(fields: [ims_invoice_id], references: [id])
  tally_entry  TallyEntry?  @relation(fields: [tally_entry_id], references: [id])
  done_by      User?        @relation("DoneBy", fields: [done_by_id], references: [id])
}

model Notification {
  id           String           @id @default(uuid())
  recipient_id String
  sender_id    String?
  client_id    String?
  type         NotificationType
  message      String
  is_read      Boolean          @default(false)
  created_at   DateTime         @default(now())

  recipient User    @relation("Recipient", fields: [recipient_id], references: [id])
  sender    User?   @relation("Sender", fields: [sender_id], references: [id])
  client    Client? @relation(fields: [client_id], references: [id])
}

model AuditLog {
  id          String   @id @default(uuid())
  user_id     String
  action      String
  entity_type String
  entity_id   String?
  metadata    Json?
  created_at  DateTime @default(now())

  user User @relation(fields: [user_id], references: [id])
}
```

---

## 5. Seed Script (`prisma/seed.ts`)

Creates in dependency order:

1. **Organization** — `{ name: "Demo CA Associates" }`
2. **Users** (5 total, Supabase auth created via service-role client, then `public.users` row inserted):
   - `ca_admin@demo.com` — `CA_ADMIN`, linked to org
   - `staff@demo.com` — `CA_STAFF`, linked to org
   - `alpha@demo.com` — `CLIENT`
   - `beta@demo.com` — `CLIENT`
   - `gamma@demo.com` — `CLIENT`
3. **Clients** (3):
   - Alpha Manufacturing → `alpha@demo.com`
   - Beta Retail → `beta@demo.com`
   - Gamma Services → `gamma@demo.com`
4. **ClientGstins** (4):
   - Alpha: `27AABCA1234A1Z5` (primary)
   - Beta: `29AABCB5678B1Z3` (primary)
   - Gamma: `07AABCG9012C1Z1` (primary), `27AABCG9012C1Z2` (secondary)
5. **UploadSession** — period `2026-01`, Alpha GSTIN, status `DONE`, uploaded by `ca_admin`
6. **ImsInvoices** — 30 rows parsed from `data/sample-ims.json` via the IMS parser
7. **TallyEntries** — 28 rows parsed from `data/sample-tally.csv` via the Tally parser
8. **ReconciliationResults** — run the recon engine against the session; persist all 30 results

Running `npm run db:seed` produces a fully navigable demo with all four outcome types visible.

---

## 6. Sample Data Files

### `data/sample-ims.json` — 30 invoices

| # | Scenario | Expected outcome |
|---|---|---|
| 1–20 | Exact GSTIN + invoice# + value within 2% | `AUTO_ACCEPTED` |
| 21–23 | Same GSTIN + invoice#, value ~2% higher | `PENDING_REVIEW` |
| 24–25 | Same GSTIN + invoice#, value ~12% higher | `AUTO_REJECTED` |
| 26–27 | Wrong supplier GSTIN | `AUTO_REJECTED` |
| 28 | Duplicate of invoice #1 | `AUTO_REJECTED` |
| 29–30 | No matching Tally entry | `NOT_IN_BOOKS` |

### `data/sample-tally.csv` — 28 entries

Standard Tally headers: `Supplier Name, Party GSTIN, Voucher Number, Voucher Date, Total Amount, Taxable Value, IGST Amount, CGST Amount, SGST Amount, HSN Code`

Matches invoices 1–28 from IMS (invoices 29–30 intentionally absent).

### `data/sample-tally-variant.csv` — 28 entries

Same data, non-standard headers: `Vendor Name, Vendor GSTIN, Bill Number, Bill Date, Invoice Total, Base Amount, IGST, CGST, SGST, HSN` — to exercise the column-mapping UI.

---

## 7. What This Scaffold Does NOT Include

- Any page UI beyond stub `page.tsx` files (those come in later feature sprints)
- Working auth middleware (scaffolded but no routes protected yet)
- Parser implementations (stubbed with `TODO` — implemented in the parsers sprint)
- Reconciliation engine logic (stubbed — implemented in the recon sprint)
- Email/WhatsApp (Phase 2)
- GSTN API integration (Phase 3)
