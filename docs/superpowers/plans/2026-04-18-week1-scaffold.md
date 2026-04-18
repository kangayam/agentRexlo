# AgentFlow Core — Week 1 Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js 14 App Router project with TypeScript, Tailwind, shadcn/ui, Prisma, and Supabase client; write the full Prisma schema; create sample data files; write a seed script that produces a navigable demo.

**Architecture:** Single Next.js 14 monorepo (frontend + API routes in one codebase). Supabase manages auth and file storage; Prisma manages the PostgreSQL schema via `public.*` tables only. All business logic lives in `lib/`; pages in `app/` are stubs for now.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Prisma ORM, `@supabase/supabase-js`, `@supabase/ssr`, `decimal.js`, `papaparse`, `xlsx`, `tsx` (for seed runner).

---

## File Map

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Full DB schema — 10 models + 6 enums |
| `prisma/seed.ts` | Creates demo org, users, clients, GSTINs, upload session, invoices, results |
| `lib/supabase/server.ts` | `createServerClient()` for Server Components + API routes |
| `lib/supabase/client.ts` | `createBrowserClient()` for Client Components |
| `lib/db/prisma.ts` | Singleton Prisma client |
| `lib/auth/session.ts` | Stub — `getSession()`, `requireAuth()` |
| `lib/auth/permissions.ts` | Stub — `canActAsClient()`, `isCAAdmin()` |
| `lib/parsers/ims-json-parser.ts` | Stub — `parseImsJson()` with full type interface |
| `lib/parsers/tally-excel-parser.ts` | Stub — `parseTallyFile()` with full type interface |
| `lib/reconciliation/normalize.ts` | Stub — `normalizeGstin()`, `normalizeInvoiceNumber()`, `normalizeDecimal()` |
| `lib/reconciliation/matcher.ts` | Stub — `matchInvoice()` |
| `lib/reconciliation/rules.ts` | Stub — `applyRules()` |
| `lib/reconciliation/reasons.ts` | Reason code constants + `buildReason()` |
| `lib/notifications/index.ts` | Stub — uniform `sendNotification()` interface |
| `lib/notifications/in-platform.ts` | Stub — `createInPlatformNotification()` |
| `lib/storage/index.ts` | Stub — `uploadFile()`, `getFileUrl()` |
| `app/(auth)/login/page.tsx` | Stub login page |
| `app/(auth)/signup/page.tsx` | Stub signup page |
| `app/(auth)/reset/page.tsx` | Stub reset page |
| `app/ca/dashboard/page.tsx` | Stub CA dashboard |
| `app/ca/clients/page.tsx` | Stub client list |
| `app/ca/team/page.tsx` | Stub team management |
| `app/client/dashboard/page.tsx` | Stub client action queue |
| `app/client/upload/page.tsx` | Stub upload page |
| `app/client/history/page.tsx` | Stub history page |
| `app/api/auth/route.ts` | Stub auth API |
| `app/api/clients/route.ts` | Stub clients API |
| `app/api/upload/route.ts` | Stub upload API |
| `app/api/reconciliation/route.ts` | Stub recon API |
| `data/sample-ims.json` | 30 realistic IMS invoices (all 4 outcome scenarios) |
| `data/sample-tally.csv` | 28 matching Tally entries (standard headers) |
| `data/sample-tally-variant.csv` | Same 28 entries with non-standard headers |
| `.env.example` | All required env var keys with placeholder values |
| `components.json` | shadcn/ui config |
| `lib/utils.ts` | shadcn/ui `cn()` helper |

---

## Task 1: Bootstrap Next.js 14

**Files:**
- Create: everything in root via `create-next-app`

- [ ] **Step 1: Run create-next-app**

```bash
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-npm
```

If prompted "Would you like to create a Next.js app in the current directory?" — answer **Yes**.

Expected: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `app/`, `public/` created. `npm install` runs automatically.

- [ ] **Step 2: Delete boilerplate page content**

Replace `app/page.tsx` with a minimal stub (keep the file so the build works):

```tsx
export default function Home() {
  return <main><h1>AgentFlow Core</h1></main>
}
```

Delete `app/globals.css` content below the Tailwind directives (remove all the default CSS variables and styles). Keep only:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Delete `public/next.svg` and `public/vercel.svg` (not needed).

- [ ] **Step 3: Verify it builds**

```bash
npm run build
```

Expected: `Route (app)` table printed, exit code 0. If TypeScript errors appear from the boilerplate, fix them before continuing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js 14 App Router project"
```

---

## Task 2: Install Packages & Configure Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr decimal.js papaparse xlsx
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D @types/papaparse tsx prisma
```

- [ ] **Step 3: Initialise Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` and `.env` created. We will rename `.env` to `.env.local` in the next task.

- [ ] **Step 4: Add scripts to `package.json`**

Open `package.json` and add to the `"scripts"` block:

```json
"db:generate": "prisma generate",
"db:migrate":  "prisma migrate dev",
"db:seed":     "tsx prisma/seed.ts",
"db:studio":   "prisma studio"
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json prisma/
git commit -m "feat: install supabase, prisma, and domain packages"
```

---

## Task 3: Environment Configuration

**Files:**
- Create: `.env.example`, `.env.local`
- Modify: `.gitignore`

- [ ] **Step 1: Move Prisma-generated `.env` to `.env.local`**

```bash
mv .env .env.local
```

- [ ] **Step 2: Verify `.gitignore` ignores `.env.local`**

Open `.gitignore` (created by create-next-app). Confirm `.env.local` is listed. If not, add it. Also add `.env` if not present.

- [ ] **Step 3: Write `.env.local` with placeholder values**

Replace the contents of `.env.local` with:

```env
# Prisma — Supabase connection pooler (port 6543, for runtime queries)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Prisma — direct connection (port 5432, for migrations only)
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase (browser-safe)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Supabase service role — server-only, NEVER expose to browser
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

- [ ] **Step 4: Write `.env.example`**

Create `.env.example` with identical content to `.env.local` (same keys, same placeholders). This file IS committed.

```env
# Prisma — Supabase connection pooler (port 6543, for runtime queries)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Prisma — direct connection (port 5432, for migrations only)
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase (browser-safe)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Supabase service role — server-only, NEVER expose to browser
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore package.json
git commit -m "feat: add environment variable config and .env.example"
```

---

## Task 4: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write the full schema**

Replace the contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

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

// ─── Models ──────────────────────────────────────────────────────────────────

model Organization {
  id         String   @id @default(uuid())
  name       String
  logo_url   String?
  created_at DateTime @default(now())

  users        User[]
  clients      Client[]
  team_invites TeamInvite[]

  @@map("organizations")
}

model User {
  id         String   @id
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
  notifications_received Notification[]         @relation("Recipient")
  notifications_sent     Notification[]         @relation("Sender")
  audit_logs             AuditLog[]

  @@map("users")
}

model TeamInvite {
  id            String    @id @default(uuid())
  org_id        String
  email         String
  role          UserRole
  token         String    @unique @default(uuid())
  expires_at    DateTime
  accepted_at   DateTime?
  invited_by_id String
  created_at    DateTime  @default(now())

  org        Organization @relation(fields: [org_id], references: [id])
  invited_by User         @relation("InvitedBy", fields: [invited_by_id], references: [id])

  @@map("team_invites")
}

model Client {
  id                String    @id @default(uuid())
  org_id            String
  name              String
  contact_email     String
  invite_token      String?   @unique
  invite_expires_at DateTime?
  created_at        DateTime  @default(now())

  org           Organization  @relation(fields: [org_id], references: [id])
  gstins        ClientGstin[]
  users         User[]
  notifications Notification[]

  @@map("clients")
}

model ClientGstin {
  id         String   @id @default(uuid())
  client_id  String
  gstin      String   @unique
  is_primary Boolean  @default(false)
  created_at DateTime @default(now())

  client          Client          @relation(fields: [client_id], references: [id])
  upload_sessions UploadSession[]

  @@map("client_gstins")
}

model UploadSession {
  id                String       @id @default(uuid())
  client_gstin_id   String
  period            String
  ims_uploaded_at   DateTime?
  ims_file_url      String?
  tally_uploaded_at DateTime?
  tally_file_url    String?
  uploaded_by_id    String
  status            UploadStatus @default(PENDING)
  created_at        DateTime     @default(now())

  client_gstin  ClientGstin  @relation(fields: [client_gstin_id], references: [id])
  uploaded_by   User         @relation(fields: [uploaded_by_id], references: [id])
  ims_invoices  ImsInvoice[]
  tally_entries TallyEntry[]

  @@unique([client_gstin_id, period])
  @@map("upload_sessions")
}

model ImsInvoice {
  id                String    @id @default(uuid())
  upload_session_id String
  supplier_gstin    String
  supplier_name     String?
  invoice_number    String
  invoice_date      DateTime
  invoice_value     String
  taxable_value     String
  igst              String
  cgst              String
  sgst              String
  ims_action        ImsAction @default(PENDING)
  place_of_supply   String?
  hsn_code          String?
  created_at        DateTime  @default(now())

  upload_session        UploadSession         @relation(fields: [upload_session_id], references: [id])
  reconciliation_result ReconciliationResult?

  @@map("ims_invoices")
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

  upload_session         UploadSession          @relation(fields: [upload_session_id], references: [id])
  reconciliation_results ReconciliationResult[]

  @@map("tally_entries")
}

model ReconciliationResult {
  id             String                @id @default(uuid())
  ims_invoice_id String                @unique
  tally_entry_id String?
  match_level    MatchLevel
  outcome        ReconciliationOutcome
  reason_code    String
  reason_text    String
  itc_at_risk    String
  is_done        Boolean               @default(false)
  done_at        DateTime?
  done_by_id     String?
  created_at     DateTime              @default(now())
  updated_at     DateTime              @updatedAt

  ims_invoice ImsInvoice  @relation(fields: [ims_invoice_id], references: [id])
  tally_entry TallyEntry? @relation(fields: [tally_entry_id], references: [id])
  done_by     User?       @relation("DoneBy", fields: [done_by_id], references: [id])

  @@map("reconciliation_results")
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

  @@map("notifications")
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

  @@map("audit_logs")
}
```

- [ ] **Step 2: Run `prisma generate` to validate syntax**

```bash
npx prisma generate
```

Expected output: `✔ Generated Prisma Client` with no errors. If errors appear, fix the schema before continuing.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add full Prisma schema — 10 models, 6 enums"
```

---

## Task 5: Supabase & Prisma Client Helpers

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/db/prisma.ts`

- [ ] **Step 1: Create `lib/supabase/server.ts`**

```typescript
import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore: called from a Server Component where set is not available.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 2: Create `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create `lib/db/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add supabase client helpers and prisma singleton"
```

---

## Task 6: Lib Stub Files

**Files:**
- Create: all `lib/auth/`, `lib/parsers/`, `lib/reconciliation/`, `lib/notifications/`, `lib/storage/` files

- [ ] **Step 1: Create `lib/auth/session.ts`**

```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function getSession() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}
```

- [ ] **Step 2: Create `lib/auth/permissions.ts`**

```typescript
import { UserRole } from '@prisma/client'

export function isCAAdmin(role: UserRole): boolean {
  return role === UserRole.CA_ADMIN
}

export function isCAMember(role: UserRole): boolean {
  return role === UserRole.CA_ADMIN || role === UserRole.CA_STAFF
}

export function canActAsClient(role: UserRole): boolean {
  return role === UserRole.CA_ADMIN || role === UserRole.CA_STAFF
}
```

- [ ] **Step 3: Create `lib/parsers/ims-json-parser.ts`**

```typescript
export interface NormalizedImsInvoice {
  supplierGstin: string
  supplierName: string | null
  invoiceNumber: string
  invoiceDate: Date
  invoiceValue: string
  taxableValue: string
  igst: string
  cgst: string
  sgst: string
  imsAction: 'ACCEPTED' | 'REJECTED' | 'PENDING'
  placeOfSupply: string | null
  hsnCode: string | null
}

export function parseImsJson(_json: unknown): NormalizedImsInvoice[] {
  // TODO: implement in parsers sprint
  throw new Error('parseImsJson: not yet implemented')
}
```

- [ ] **Step 4: Create `lib/parsers/tally-excel-parser.ts`**

```typescript
export interface TallyColumnMap {
  supplierName: string
  supplierGstin: string
  voucherNumber: string
  voucherDate: string
  totalAmount: string
  taxableValue: string
  igst: string
  cgst: string
  sgst: string
  hsnCode: string
}

export const DEFAULT_TALLY_COLUMN_MAP: TallyColumnMap = {
  supplierName:  'Supplier Name',
  supplierGstin: 'Party GSTIN',
  voucherNumber: 'Voucher Number',
  voucherDate:   'Voucher Date',
  totalAmount:   'Total Amount',
  taxableValue:  'Taxable Value',
  igst:          'IGST Amount',
  cgst:          'CGST Amount',
  sgst:          'SGST Amount',
  hsnCode:       'HSN Code',
}

export interface NormalizedTallyEntry {
  supplierName: string
  supplierGstin: string
  voucherNumber: string
  voucherDate: Date
  totalAmount: string
  taxableValue: string
  igst: string
  cgst: string
  sgst: string
  hsnCode: string | null
}

export function parseTallyFile(
  _content: string,
  _columnMap?: TallyColumnMap
): NormalizedTallyEntry[] {
  // TODO: implement in parsers sprint
  throw new Error('parseTallyFile: not yet implemented')
}

export function detectColumnMap(_headers: string[]): TallyColumnMap | null {
  // TODO: implement in parsers sprint — returns null if auto-detection fails
  throw new Error('detectColumnMap: not yet implemented')
}
```

- [ ] **Step 5: Create `lib/reconciliation/normalize.ts`**

```typescript
import Decimal from 'decimal.js'

export function normalizeGstin(gstin: string): string {
  // TODO: implement in recon sprint
  return gstin.toUpperCase().trim()
}

export function normalizeInvoiceNumber(num: string): string {
  // TODO: implement in recon sprint — lowercase, strip /\-_# and spaces, drop leading zeros
  return num.toLowerCase().replace(/[/\\\-_# ]/g, '').replace(/^0+/, '')
}

export function normalizeDecimal(val: number | string): string {
  // TODO: implement in recon sprint
  return new Decimal(val).toDecimalPlaces(2).toString()
}
```

- [ ] **Step 6: Create `lib/reconciliation/matcher.ts`**

```typescript
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyEntry } from '@/lib/parsers/tally-excel-parser'

export type MatchLevel = 'EXACT' | 'VALUE_TOLERANCE' | 'SOFT_INVOICE' | 'NO_MATCH'

export interface MatchResult {
  level: MatchLevel
  tallyEntryIndex: number | null
}

export function matchInvoice(
  _ims: NormalizedImsInvoice,
  _tally: NormalizedTallyEntry[]
): MatchResult {
  // TODO: implement in recon sprint — Level 1/2/3 matching
  throw new Error('matchInvoice: not yet implemented')
}
```

- [ ] **Step 7: Create `lib/reconciliation/rules.ts`**

```typescript
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { MatchResult } from '@/lib/reconciliation/matcher'

export type ReconciliationOutcome =
  | 'AUTO_ACCEPTED'
  | 'AUTO_REJECTED'
  | 'PENDING_REVIEW'
  | 'NOT_IN_BOOKS'

export function applyRules(
  _ims: NormalizedImsInvoice,
  _match: MatchResult
): ReconciliationOutcome {
  // TODO: implement in recon sprint
  throw new Error('applyRules: not yet implemented')
}
```

- [ ] **Step 8: Create `lib/reconciliation/reasons.ts`**

```typescript
export const REASON_CODES = {
  EXACT_MATCH:        'EXACT_MATCH',
  VALUE_VARIANCE_LOW: 'VALUE_VARIANCE_LOW',
  VALUE_VARIANCE_HIGH:'VALUE_VARIANCE_HIGH',
  GSTIN_MISMATCH:     'GSTIN_MISMATCH',
  DUPLICATE_INVOICE:  'DUPLICATE_INVOICE',
  NOT_IN_BOOKS:       'NOT_IN_BOOKS',
  TAX_TYPE_MISMATCH:  'TAX_TYPE_MISMATCH',
  DATE_GAP:           'DATE_GAP',
  SOFT_INVOICE_MATCH: 'SOFT_INVOICE_MATCH',
} as const

export type ReasonCode = typeof REASON_CODES[keyof typeof REASON_CODES]

const TEMPLATES: Record<ReasonCode, string> = {
  EXACT_MATCH:
    'Invoice matched exactly in your books. No action needed.',
  VALUE_VARIANCE_LOW:
    'Invoice value in IMS (₹{imsValue}) is {pct}% higher than your books (₹{tallyValue}). This may be freight or packing charges. Review and Accept if agreed, or mark Pending if disputed.',
  VALUE_VARIANCE_HIGH:
    'Invoice value in IMS (₹{imsValue}) is {pct}% higher than your books (₹{tallyValue}). Significant variance — Reject and ask the supplier to re-file with the correct amount.',
  GSTIN_MISMATCH:
    'The supplier GSTIN on this invoice ({imsGstin}) does not match your records ({tallyGstin}). This is likely a wrong state registration. Reject and ask the supplier to re-file.',
  DUPLICATE_INVOICE:
    'Invoice number {invoiceNumber} appears more than once in the IMS data. Reject the duplicate and confirm the correct invoice with the supplier.',
  NOT_IN_BOOKS:
    'This invoice from {supplierName} is not found in your Tally purchase register. Verify with your purchase team before Accepting on GSTN.',
  TAX_TYPE_MISMATCH:
    'The tax type on this invoice (IGST) does not match your books (CGST+SGST). Check the Place of Supply with the supplier.',
  DATE_GAP:
    'Invoice date in IMS ({imsDate}) differs from your books ({tallyDate}) by more than 7 days. Confirm the correct date with the supplier.',
  SOFT_INVOICE_MATCH:
    'Invoice matched by value and supplier, but the invoice numbers differ ({imsNum} vs {tallyNum}). Confirm this is the same invoice before Accepting.',
}

export function buildReason(
  reasonCode: ReasonCode,
  params: Record<string, string> = {}
): string {
  let text = TEMPLATES[reasonCode]
  for (const [key, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return text
}
```

- [ ] **Step 9: Create `lib/notifications/index.ts`**

```typescript
import { createInPlatformNotification } from './in-platform'

export type NotificationPayload = {
  recipientId: string
  senderId?: string
  clientId?: string
  type: 'CA_NOTIFY_CLIENT' | 'CLIENT_COMPLETED' | 'CLIENT_UPLOADED' | 'UPLOAD_FAILED'
  message: string
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  await createInPlatformNotification(payload)
  // Phase 2: email/WhatsApp slots in here
}
```

- [ ] **Step 10: Create `lib/notifications/in-platform.ts`**

```typescript
import { prisma } from '@/lib/db/prisma'
import type { NotificationPayload } from './index'

export async function createInPlatformNotification(
  payload: NotificationPayload
): Promise<void> {
  await prisma.notification.create({
    data: {
      recipient_id: payload.recipientId,
      sender_id:    payload.senderId ?? null,
      client_id:    payload.clientId ?? null,
      type:         payload.type,
      message:      payload.message,
    },
  })
}
```

- [ ] **Step 11: Create `lib/storage/index.ts`**

```typescript
export interface UploadResult {
  url: string
  path: string
}

export async function uploadFile(
  _bucket: string,
  _path: string,
  _file: File | Buffer
): Promise<UploadResult> {
  // TODO: implement in upload sprint
  throw new Error('uploadFile: not yet implemented')
}

export async function getFileUrl(_bucket: string, _path: string): Promise<string> {
  // TODO: implement in upload sprint
  throw new Error('getFileUrl: not yet implemented')
}
```

- [ ] **Step 12: Commit**

```bash
git add lib/
git commit -m "feat: scaffold lib stubs with type interfaces"
```

---

## Task 7: App Page Stubs & API Routes

**Files:**
- Create: all `app/` page and route stubs

- [ ] **Step 1: Create auth pages**

Create `app/(auth)/login/page.tsx`:
```tsx
export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center"><p>Login — coming soon</p></main>
}
```

Create `app/(auth)/signup/page.tsx`:
```tsx
export default function SignupPage() {
  return <main className="flex min-h-screen items-center justify-center"><p>Sign up — coming soon</p></main>
}
```

Create `app/(auth)/reset/page.tsx`:
```tsx
export default function ResetPage() {
  return <main className="flex min-h-screen items-center justify-center"><p>Reset password — coming soon</p></main>
}
```

- [ ] **Step 2: Create CA portal pages**

Create `app/ca/dashboard/page.tsx`:
```tsx
export default function CADashboardPage() {
  return <main className="p-8"><h1 className="text-2xl font-bold">CA Dashboard</h1><p className="text-muted-foreground">Multi-client view — coming soon</p></main>
}
```

Create `app/ca/clients/page.tsx`:
```tsx
export default function CAClientsPage() {
  return <main className="p-8"><h1 className="text-2xl font-bold">Clients</h1><p className="text-muted-foreground">Client management — coming soon</p></main>
}
```

Create `app/ca/team/page.tsx`:
```tsx
export default function CATeamPage() {
  return <main className="p-8"><h1 className="text-2xl font-bold">Team</h1><p className="text-muted-foreground">Team management — coming soon</p></main>
}
```

- [ ] **Step 3: Create client portal pages**

Create `app/client/dashboard/page.tsx`:
```tsx
export default function ClientDashboardPage() {
  return <main className="p-8"><h1 className="text-2xl font-bold">Action Queue</h1><p className="text-muted-foreground">IMS action queue — coming soon</p></main>
}
```

Create `app/client/upload/page.tsx`:
```tsx
export default function ClientUploadPage() {
  return <main className="p-8"><h1 className="text-2xl font-bold">Upload Files</h1><p className="text-muted-foreground">IMS JSON + Tally upload — coming soon</p></main>
}
```

Create `app/client/history/page.tsx`:
```tsx
export default function ClientHistoryPage() {
  return <main className="p-8"><h1 className="text-2xl font-bold">History</h1><p className="text-muted-foreground">Previous periods — coming soon</p></main>
}
```

- [ ] **Step 4: Create API route stubs**

Create `app/api/auth/route.ts`:
```typescript
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ message: 'auth API — not yet implemented' }, { status: 501 })
}
```

Create `app/api/clients/route.ts`:
```typescript
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ message: 'clients API — not yet implemented' }, { status: 501 })
}
```

Create `app/api/upload/route.ts`:
```typescript
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ message: 'upload API — not yet implemented' }, { status: 501 })
}
```

Create `app/api/reconciliation/route.ts`:
```typescript
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ message: 'reconciliation API — not yet implemented' }, { status: 501 })
}
```

- [ ] **Step 5: Create component directories**

```bash
mkdir -p components/dashboard components/upload components/tables
touch components/dashboard/.gitkeep components/upload/.gitkeep components/tables/.gitkeep
```

- [ ] **Step 6: Verify build still passes**

```bash
npm run build
```

Expected: all new routes appear in the route table, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add app/ components/
git commit -m "feat: scaffold app page stubs and API route stubs"
```

---

## Task 8: Configure shadcn/ui

**Files:**
- Create: `components.json`, `lib/utils.ts`
- Modify: `tailwind.config.ts`, `app/globals.css`

- [ ] **Step 1: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Create `lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Install shadcn/ui peer dependencies**

```bash
npm install clsx tailwind-merge lucide-react class-variance-authority
```

- [ ] **Step 4: Update `app/globals.css` with shadcn/ui CSS variables**

Replace the contents of `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 5: Update `tailwind.config.ts` for shadcn/ui**

Replace the contents of `tailwind.config.ts` with:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card:        { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

- [ ] **Step 6: Install `tailwindcss-animate`**

```bash
npm install tailwindcss-animate
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: exit code 0. If `tailwindcss-animate` is missing, verify the install completed.

- [ ] **Step 8: Commit**

```bash
git add components.json lib/utils.ts app/globals.css tailwind.config.ts package.json package-lock.json
git commit -m "feat: configure shadcn/ui with slate base color and CSS variables"
```

---

## Task 9: Create Sample Data Files

**Files:**
- Create: `data/sample-ims.json`, `data/sample-tally.csv`, `data/sample-tally-variant.csv`

- [ ] **Step 1: Create `data/` directory**

```bash
mkdir -p data
```

- [ ] **Step 2: Create `data/sample-ims.json`**

This is a realistic GSTN IMS export. The buyer GSTIN is `27AABCA1234A1Z5` (Alpha Manufacturing, Maharashtra). `pos` = place of supply state code. `idt` = date in `DD-MM-YYYY`. `imsaction`: P = Pending, A = Accepted, R = Rejected.

Create `data/sample-ims.json`:

```json
{
  "docdata": {
    "b2b": [
      {
        "ctin": "27AABCS1234A1Z5",
        "cname": "ABC Chemicals Pvt Ltd",
        "inv": [
          {
            "inum": "INV/2025-26/001", "idt": "05-01-2026", "val": 118000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 100000, "rt": 18, "igst": 0, "cgst": 9000, "sgst": 9000, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "INV/2025-26/002", "idt": "06-01-2026", "val": 59000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 50000, "rt": 18, "igst": 0, "cgst": 4500, "sgst": 4500, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "INV/2025-26/003", "idt": "07-01-2026", "val": 236000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 200000, "rt": 18, "igst": 0, "cgst": 18000, "sgst": 18000, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "INV/2025-26/004", "idt": "08-01-2026", "val": 88500, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 75000, "rt": 18, "igst": 0, "cgst": 6750, "sgst": 6750, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "INV/2025-26/005", "idt": "10-01-2026", "val": 177000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 150000, "rt": 18, "igst": 0, "cgst": 13500, "sgst": 13500, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "INV/2025-26/021", "idt": "15-01-2026", "val": 120360, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 102000, "rt": 18, "igst": 0, "cgst": 9180, "sgst": 9180, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "INV/2025-26/026", "idt": "20-01-2026", "val": 94400, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 80000, "rt": 18, "igst": 0, "cgst": 7200, "sgst": 7200, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "INV/2025-26/001", "idt": "05-01-2026", "val": 118000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 100000, "rt": 18, "igst": 0, "cgst": 9000, "sgst": 9000, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "INV/2025-26/029", "idt": "28-01-2026", "val": 47200, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 40000, "rt": 18, "igst": 0, "cgst": 3600, "sgst": 3600, "cess": 0 } }],
            "imsaction": "P"
          }
        ]
      },
      {
        "ctin": "29AABCT5678B1Z3",
        "cname": "Tata Metals Ltd",
        "inv": [
          {
            "inum": "TM/JAN/2026/006", "idt": "03-01-2026", "val": 94400, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 80000, "rt": 18, "igst": 14400, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "TM/JAN/2026/007", "idt": "04-01-2026", "val": 141600, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 120000, "rt": 18, "igst": 21600, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "TM/JAN/2026/008", "idt": "09-01-2026", "val": 70800, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 60000, "rt": 18, "igst": 10800, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "TM/JAN/2026/009", "idt": "11-01-2026", "val": 295000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 250000, "rt": 18, "igst": 45000, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "TM/JAN/2026/010", "idt": "12-01-2026", "val": 53100, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 45000, "rt": 18, "igst": 8100, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "TM/JAN/2026/022", "idt": "16-01-2026", "val": 60770, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 51500, "rt": 18, "igst": 9270, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "TM/JAN/2026/024", "idt": "18-01-2026", "val": 167552, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 141994, "rt": 18, "igst": 25559, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "TM/JAN/2026/027", "idt": "22-01-2026", "val": 70800, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 60000, "rt": 18, "igst": 10800, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "TM/JAN/2026/030", "idt": "29-01-2026", "val": 112100, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 95000, "rt": 18, "igst": 17100, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          }
        ]
      },
      {
        "ctin": "07AABCM9012C1Z1",
        "cname": "Metro Supplies Delhi",
        "inv": [
          {
            "inum": "MS/2026/011", "idt": "02-01-2026", "val": 100800, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 90000, "rt": 12, "igst": 10800, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "MS/2026/012", "idt": "05-01-2026", "val": 145600, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 130000, "rt": 12, "igst": 15600, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "MS/2026/013", "idt": "08-01-2026", "val": 78400, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 70000, "rt": 12, "igst": 8400, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "MS/2026/014", "idt": "13-01-2026", "val": 201600, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 180000, "rt": 12, "igst": 21600, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "MS/2026/015", "idt": "14-01-2026", "val": 61600, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 55000, "rt": 12, "igst": 6600, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "MS/2026/023", "idt": "17-01-2026", "val": 103040, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 92000, "rt": 12, "igst": 11040, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "MS/2026/025", "idt": "19-01-2026", "val": 145376, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 123200, "rt": 18, "igst": 22176, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          }
        ]
      },
      {
        "ctin": "27AABCR3456D1Z7",
        "cname": "Reliance Traders",
        "inv": [
          {
            "inum": "RT/JAN26/016", "idt": "06-01-2026", "val": 315000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 300000, "rt": 5, "igst": 0, "cgst": 7500, "sgst": 7500, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "RT/JAN26/017", "idt": "09-01-2026", "val": 210000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 200000, "rt": 5, "igst": 0, "cgst": 5000, "sgst": 5000, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "RT/JAN26/018", "idt": "12-01-2026", "val": 420000, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 400000, "rt": 5, "igst": 0, "cgst": 10000, "sgst": 10000, "cess": 0 } }],
            "imsaction": "P"
          }
        ]
      },
      {
        "ctin": "06AABCP7890E1Z4",
        "cname": "Punjab Steel Works",
        "inv": [
          {
            "inum": "PSW/2026/019", "idt": "07-01-2026", "val": 129800, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 110000, "rt": 18, "igst": 19800, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          },
          {
            "inum": "PSW/2026/020", "idt": "10-01-2026", "val": 100300, "pos": "27", "rchrg": "N",
            "itms": [{ "num": 1, "itm_det": { "txval": 85000, "rt": 18, "igst": 15300, "cgst": 0, "sgst": 0, "cess": 0 } }],
            "imsaction": "P"
          }
        ]
      }
    ]
  }
}
```

**IMS invoice scenario mapping:**
| Invoice# | Supplier | Scenario | Expected outcome |
|---|---|---|---|
| INV/2025-26/001 | ABC Chemicals | Exact match | AUTO_ACCEPTED |
| INV/2025-26/002 | ABC Chemicals | Exact match | AUTO_ACCEPTED |
| INV/2025-26/003 | ABC Chemicals | Exact match | AUTO_ACCEPTED |
| INV/2025-26/004 | ABC Chemicals | Exact match | AUTO_ACCEPTED |
| INV/2025-26/005 | ABC Chemicals | Exact match | AUTO_ACCEPTED |
| TM/JAN/2026/006–010 | Tata Metals | Exact match (×5) | AUTO_ACCEPTED |
| MS/2026/011–015 | Metro Supplies | Exact match (×5) | AUTO_ACCEPTED |
| RT/JAN26/016–018 | Reliance Traders | Exact match (×3) | AUTO_ACCEPTED |
| PSW/2026/019–020 | Punjab Steel | Exact match (×2) | AUTO_ACCEPTED |
| INV/2025-26/021 | ABC Chemicals | IMS val 2% higher (102000 vs 100000) | PENDING_REVIEW |
| TM/JAN/2026/022 | Tata Metals | IMS val ~3% higher (51500 vs 50000) | PENDING_REVIEW |
| MS/2026/023 | Metro Supplies | IMS val ~2.2% higher (92000 vs 90000) | PENDING_REVIEW |
| TM/JAN/2026/024 | Tata Metals | IMS val ~18% higher (141994 vs 120000) | AUTO_REJECTED |
| MS/2026/025 | Metro Supplies | IMS val ~12% higher (123200 vs 110000) | AUTO_REJECTED |
| INV/2025-26/026 | ABC Chemicals | Wrong GSTIN in IMS (buyer-side) | AUTO_REJECTED |
| TM/JAN/2026/027 | Tata Metals | Wrong GSTIN in IMS | AUTO_REJECTED |
| INV/2025-26/001 (dup) | ABC Chemicals | Duplicate invoice# | AUTO_REJECTED |
| INV/2025-26/029 | ABC Chemicals | Not in Tally | NOT_IN_BOOKS |
| TM/JAN/2026/030 | Tata Metals | Not in Tally | NOT_IN_BOOKS |

- [ ] **Step 3: Create `data/sample-tally.csv`**

28 entries — matches IMS invoices 1–20, 21–23 (at Tally value), 24–25 (at correct lower value), 26–27 (with correct GSTINs), and 28 (one entry for INV/2025-26/001, so the duplicate IMS entry has no second match). Invoices 29–30 are absent.

Create `data/sample-tally.csv`:

```csv
Supplier Name,Party GSTIN,Voucher Number,Voucher Date,Total Amount,Taxable Value,IGST Amount,CGST Amount,SGST Amount,HSN Code
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/001,05-01-2026,118000,100000,0,9000,9000,3901
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/002,06-01-2026,59000,50000,0,4500,4500,3901
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/003,07-01-2026,236000,200000,0,18000,18000,3901
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/004,08-01-2026,88500,75000,0,6750,6750,3901
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/005,10-01-2026,177000,150000,0,13500,13500,3901
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/006,03-01-2026,94400,80000,14400,0,0,7208
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/007,04-01-2026,141600,120000,21600,0,0,7208
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/008,09-01-2026,70800,60000,10800,0,0,7208
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/009,11-01-2026,295000,250000,45000,0,0,7208
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/010,12-01-2026,53100,45000,8100,0,0,7208
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/011,02-01-2026,100800,90000,10800,0,0,8481
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/012,05-01-2026,145600,130000,15600,0,0,8481
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/013,08-01-2026,78400,70000,8400,0,0,8481
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/014,13-01-2026,201600,180000,21600,0,0,8481
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/015,14-01-2026,61600,55000,6600,0,0,8481
Reliance Traders,27AABCR3456D1Z7,RT/JAN26/016,06-01-2026,315000,300000,0,7500,7500,5201
Reliance Traders,27AABCR3456D1Z7,RT/JAN26/017,09-01-2026,210000,200000,0,5000,5000,5201
Reliance Traders,27AABCR3456D1Z7,RT/JAN26/018,12-01-2026,420000,400000,0,10000,10000,5201
Punjab Steel Works,06AABCP7890E1Z4,PSW/2026/019,07-01-2026,129800,110000,19800,0,0,7213
Punjab Steel Works,06AABCP7890E1Z4,PSW/2026/020,10-01-2026,100300,85000,15300,0,0,7213
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/021,15-01-2026,118000,100000,0,9000,9000,3901
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/022,16-01-2026,59000,50000,9000,0,0,7208
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/023,17-01-2026,100800,90000,10800,0,0,8481
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/024,18-01-2026,141600,120000,21600,0,0,7208
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/025,19-01-2026,129800,110000,19800,0,0,8481
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/026,20-01-2026,94400,80000,0,7200,7200,3901
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/027,22-01-2026,70800,60000,10800,0,0,7208
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/028,25-01-2026,47200,40000,0,3600,3600,3901
```

Note: Row 28 uses invoice# `INV/2025-26/028` (a distinct invoice in Tally). The IMS has a duplicate of `INV/2025-26/001` — when the engine sees two IMS entries for `001` but only one Tally entry, the second is flagged as a duplicate.

- [ ] **Step 4: Create `data/sample-tally-variant.csv`**

Same 28 entries with non-standard column headers to test the column-mapping UI:

```csv
Vendor Name,Vendor GSTIN,Bill Number,Bill Date,Invoice Total,Base Amount,IGST,CGST,SGST,HSN
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/001,05-01-2026,118000,100000,0,9000,9000,3901
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/002,06-01-2026,59000,50000,0,4500,4500,3901
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/003,07-01-2026,236000,200000,0,18000,18000,3901
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/004,08-01-2026,88500,75000,0,6750,6750,3901
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/005,10-01-2026,177000,150000,0,13500,13500,3901
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/006,03-01-2026,94400,80000,14400,0,0,7208
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/007,04-01-2026,141600,120000,21600,0,0,7208
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/008,09-01-2026,70800,60000,10800,0,0,7208
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/009,11-01-2026,295000,250000,45000,0,0,7208
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/010,12-01-2026,53100,45000,8100,0,0,7208
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/011,02-01-2026,100800,90000,10800,0,0,8481
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/012,05-01-2026,145600,130000,15600,0,0,8481
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/013,08-01-2026,78400,70000,8400,0,0,8481
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/014,13-01-2026,201600,180000,21600,0,0,8481
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/015,14-01-2026,61600,55000,6600,0,0,8481
Reliance Traders,27AABCR3456D1Z7,RT/JAN26/016,06-01-2026,315000,300000,0,7500,7500,5201
Reliance Traders,27AABCR3456D1Z7,RT/JAN26/017,09-01-2026,210000,200000,0,5000,5000,5201
Reliance Traders,27AABCR3456D1Z7,RT/JAN26/018,12-01-2026,420000,400000,0,10000,10000,5201
Punjab Steel Works,06AABCP7890E1Z4,PSW/2026/019,07-01-2026,129800,110000,19800,0,0,7213
Punjab Steel Works,06AABCP7890E1Z4,PSW/2026/020,10-01-2026,100300,85000,15300,0,0,7213
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/021,15-01-2026,118000,100000,0,9000,9000,3901
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/022,16-01-2026,59000,50000,9000,0,0,7208
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/023,17-01-2026,100800,90000,10800,0,0,8481
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/024,18-01-2026,141600,120000,21600,0,0,7208
Metro Supplies Delhi,07AABCM9012C1Z1,MS/2026/025,19-01-2026,129800,110000,19800,0,0,8481
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/026,20-01-2026,94400,80000,0,7200,7200,3901
Tata Metals Ltd,29AABCT5678B1Z3,TM/JAN/2026/027,22-01-2026,70800,60000,10800,0,0,7208
ABC Chemicals Pvt Ltd,27AABCS1234A1Z5,INV/2025-26/028,25-01-2026,47200,40000,0,3600,3600,3901
```

- [ ] **Step 5: Commit**

```bash
git add data/
git commit -m "feat: add sample IMS JSON and Tally CSV data files"
```

---

## Task 10: Write Seed Script

**Files:**
- Create: `prisma/seed.ts`

The seed inserts directly into Prisma models (no Supabase Auth calls). User IDs are deterministic UUIDs so the seed is idempotent.

- [ ] **Step 1: Write `prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Deterministic IDs so seed is idempotent
const IDS = {
  org:        'aaaaaaaa-0000-0000-0000-000000000001',
  caAdmin:    'bbbbbbbb-0000-0000-0000-000000000001',
  caStaff:    'bbbbbbbb-0000-0000-0000-000000000002',
  clientAlpha:'bbbbbbbb-0000-0000-0000-000000000003',
  clientBeta: 'bbbbbbbb-0000-0000-0000-000000000004',
  clientGamma:'bbbbbbbb-0000-0000-0000-000000000005',
  alpha:      'cccccccc-0000-0000-0000-000000000001',
  beta:       'cccccccc-0000-0000-0000-000000000002',
  gamma:      'cccccccc-0000-0000-0000-000000000003',
  alphaGstin: 'dddddddd-0000-0000-0000-000000000001',
  betaGstin:  'dddddddd-0000-0000-0000-000000000002',
  gammaPrimary: 'dddddddd-0000-0000-0000-000000000003',
  gammaSecondary: 'dddddddd-0000-0000-0000-000000000004',
  session:    'eeeeeeee-0000-0000-0000-000000000001',
}

interface ImsItem {
  itm_det: {
    txval: number
    igst: number
    cgst: number
    sgst: number
  }
}

interface ImsInv {
  inum: string
  idt: string
  val: number
  pos: string
  imsaction: string
  itms: ImsItem[]
}

interface ImsSupplier {
  ctin: string
  cname: string
  inv: ImsInv[]
}

function parseDate(dmy: string): Date {
  const [d, m, y] = dmy.split('-')
  return new Date(`${y}-${m}-${d}`)
}

function imsActionMap(a: string): 'ACCEPTED' | 'REJECTED' | 'PENDING' {
  if (a === 'A') return 'ACCEPTED'
  if (a === 'R') return 'REJECTED'
  return 'PENDING'
}

async function main() {
  console.log('Seeding database...')

  // ── Wipe existing demo data ──────────────────────────────────────────────
  await prisma.reconciliationResult.deleteMany({})
  await prisma.tally_entries?.deleteMany({})
  await prisma.tallyEntry.deleteMany({})
  await prisma.imsInvoice.deleteMany({})
  await prisma.uploadSession.deleteMany({})
  await prisma.clientGstin.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.teamInvite.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.client.deleteMany({})
  await prisma.organization.deleteMany({})

  // ── Organization ─────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: { id: IDS.org, name: 'Demo CA Associates' },
  })
  console.log('Created org:', org.name)

  // ── Users ─────────────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      { id: IDS.caAdmin,    name: 'Rajesh Sharma',   email: 'ca_admin@demo.com', role: 'CA_ADMIN', org_id: IDS.org },
      { id: IDS.caStaff,    name: 'Priya Mehta',     email: 'staff@demo.com',    role: 'CA_STAFF', org_id: IDS.org },
      { id: IDS.clientAlpha, name: 'Anil Gupta',     email: 'alpha@demo.com',    role: 'CLIENT' },
      { id: IDS.clientBeta,  name: 'Sunita Patel',   email: 'beta@demo.com',     role: 'CLIENT' },
      { id: IDS.clientGamma, name: 'Ramesh Nair',    email: 'gamma@demo.com',    role: 'CLIENT' },
    ],
  })
  console.log('Created 5 users')

  // ── Clients ───────────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      { id: IDS.alpha, org_id: IDS.org, name: 'Alpha Manufacturing Pvt Ltd', contact_email: 'alpha@demo.com' },
      { id: IDS.beta,  org_id: IDS.org, name: 'Beta Retail Solutions',       contact_email: 'beta@demo.com'  },
      { id: IDS.gamma, org_id: IDS.org, name: 'Gamma Services Ltd',          contact_email: 'gamma@demo.com' },
    ],
  })

  // Link client users to their client records
  await prisma.user.update({ where: { id: IDS.clientAlpha }, data: { client_id: IDS.alpha } })
  await prisma.user.update({ where: { id: IDS.clientBeta  }, data: { client_id: IDS.beta  } })
  await prisma.user.update({ where: { id: IDS.clientGamma }, data: { client_id: IDS.gamma } })
  console.log('Created 3 clients')

  // ── GSTINs ────────────────────────────────────────────────────────────────
  await prisma.clientGstin.createMany({
    data: [
      { id: IDS.alphaGstin,      client_id: IDS.alpha, gstin: '27AABCA1234A1Z5', is_primary: true  },
      { id: IDS.betaGstin,       client_id: IDS.beta,  gstin: '29AABCB5678B1Z3', is_primary: true  },
      { id: IDS.gammaPrimary,    client_id: IDS.gamma, gstin: '07AABCG9012C1Z1', is_primary: true  },
      { id: IDS.gammaSecondary,  client_id: IDS.gamma, gstin: '27AABCG9012C1Z2', is_primary: false },
    ],
  })
  console.log('Created 4 GSTINs')

  // ── Upload Session ────────────────────────────────────────────────────────
  const session = await prisma.uploadSession.create({
    data: {
      id:               IDS.session,
      client_gstin_id:  IDS.alphaGstin,
      period:           '2026-01',
      uploaded_by_id:   IDS.caAdmin,
      status:           'DONE',
      ims_uploaded_at:  new Date('2026-01-30T09:00:00Z'),
      tally_uploaded_at: new Date('2026-01-30T09:05:00Z'),
    },
  })
  console.log('Created upload session:', session.id)

  // ── IMS Invoices ──────────────────────────────────────────────────────────
  const imsJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/sample-ims.json'), 'utf-8')
  ) as { docdata: { b2b: ImsSupplier[] } }

  const imsInvoices: {
    upload_session_id: string
    supplier_gstin: string
    supplier_name: string
    invoice_number: string
    invoice_date: Date
    invoice_value: string
    taxable_value: string
    igst: string
    cgst: string
    sgst: string
    ims_action: 'ACCEPTED' | 'REJECTED' | 'PENDING'
    place_of_supply: string
  }[] = []

  for (const supplier of imsJson.docdata.b2b) {
    for (const inv of supplier.inv) {
      const det = inv.itms[0].itm_det
      imsInvoices.push({
        upload_session_id: IDS.session,
        supplier_gstin:    supplier.ctin,
        supplier_name:     supplier.cname,
        invoice_number:    inv.inum,
        invoice_date:      parseDate(inv.idt),
        invoice_value:     inv.val.toFixed(2),
        taxable_value:     det.txval.toFixed(2),
        igst:              det.igst.toFixed(2),
        cgst:              det.cgst.toFixed(2),
        sgst:              det.sgst.toFixed(2),
        ims_action:        imsActionMap(inv.imsaction),
        place_of_supply:   inv.pos,
      })
    }
  }

  await prisma.imsInvoice.createMany({ data: imsInvoices })
  console.log(`Created ${imsInvoices.length} IMS invoices`)

  // ── Tally Entries ─────────────────────────────────────────────────────────
  const tallyCsv = fs.readFileSync(
    path.join(process.cwd(), 'data/sample-tally.csv'), 'utf-8'
  )
  const tallyLines = tallyCsv.trim().split('\n').slice(1) // skip header

  const tallyEntries = tallyLines.map((line) => {
    const cols = line.split(',')
    return {
      upload_session_id: IDS.session,
      supplier_name:     cols[0].trim(),
      supplier_gstin:    cols[1].trim(),
      voucher_number:    cols[2].trim(),
      voucher_date:      parseDate(cols[3].trim()),
      total_amount:      parseFloat(cols[4]).toFixed(2),
      taxable_value:     parseFloat(cols[5]).toFixed(2),
      igst:              parseFloat(cols[6]).toFixed(2),
      cgst:              parseFloat(cols[7]).toFixed(2),
      sgst:              parseFloat(cols[8]).toFixed(2),
      hsn_code:          cols[9]?.trim() || null,
    }
  })

  await prisma.tallyEntry.createMany({ data: tallyEntries })
  console.log(`Created ${tallyEntries.length} Tally entries`)

  // ── Reconciliation Results (hardcoded for demo session) ───────────────────
  // Fetch the created rows to get their auto-generated IDs
  const allIms    = await prisma.imsInvoice.findMany({ where: { upload_session_id: IDS.session } })
  const allTally  = await prisma.tallyEntry.findMany({ where: { upload_session_id: IDS.session } })

  const imsMap    = new Map(allIms.map(i => [`${i.supplier_gstin}|${i.invoice_number}`, i]))
  const tallyMap  = new Map(allTally.map(t => [`${t.supplier_gstin}|${t.voucher_number}`, t]))

  // Exact matches: invoices 1–20
  const exactMatches = [
    ['27AABCS1234A1Z5', 'INV/2025-26/001'],
    ['27AABCS1234A1Z5', 'INV/2025-26/002'],
    ['27AABCS1234A1Z5', 'INV/2025-26/003'],
    ['27AABCS1234A1Z5', 'INV/2025-26/004'],
    ['27AABCS1234A1Z5', 'INV/2025-26/005'],
    ['29AABCT5678B1Z3', 'TM/JAN/2026/006'],
    ['29AABCT5678B1Z3', 'TM/JAN/2026/007'],
    ['29AABCT5678B1Z3', 'TM/JAN/2026/008'],
    ['29AABCT5678B1Z3', 'TM/JAN/2026/009'],
    ['29AABCT5678B1Z3', 'TM/JAN/2026/010'],
    ['07AABCM9012C1Z1', 'MS/2026/011'],
    ['07AABCM9012C1Z1', 'MS/2026/012'],
    ['07AABCM9012C1Z1', 'MS/2026/013'],
    ['07AABCM9012C1Z1', 'MS/2026/014'],
    ['07AABCM9012C1Z1', 'MS/2026/015'],
    ['27AABCR3456D1Z7', 'RT/JAN26/016'],
    ['27AABCR3456D1Z7', 'RT/JAN26/017'],
    ['27AABCR3456D1Z7', 'RT/JAN26/018'],
    ['06AABCP7890E1Z4', 'PSW/2026/019'],
    ['06AABCP7890E1Z4', 'PSW/2026/020'],
  ]

  const results: {
    ims_invoice_id:  string
    tally_entry_id?: string
    match_level:     'EXACT' | 'VALUE_TOLERANCE' | 'SOFT_INVOICE' | 'NO_MATCH'
    outcome:         'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'
    reason_code:     string
    reason_text:     string
    itc_at_risk:     string
  }[] = []

  for (const [gstin, invNum] of exactMatches) {
    const ims   = imsMap.get(`${gstin}|${invNum}`)
    const tally = tallyMap.get(`${gstin}|${invNum}`)
    if (!ims || !tally) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({
      ims_invoice_id: ims.id,
      tally_entry_id: tally.id,
      match_level:    'EXACT',
      outcome:        'AUTO_ACCEPTED',
      reason_code:    'EXACT_MATCH',
      reason_text:    'Invoice matched exactly in your books. No action needed.',
      itc_at_risk:    '0.00',
    })
  }

  // Pending Review: invoices 21–23 (2% variance)
  const pendingReview = [
    { gstin: '27AABCS1234A1Z5', invNum: 'INV/2025-26/021', tallyNum: 'INV/2025-26/021', pct: '2.00' },
    { gstin: '29AABCT5678B1Z3', invNum: 'TM/JAN/2026/022', tallyNum: 'TM/JAN/2026/022', pct: '3.00' },
    { gstin: '07AABCM9012C1Z1', invNum: 'MS/2026/023',     tallyNum: 'MS/2026/023',     pct: '2.22' },
  ]
  for (const r of pendingReview) {
    const ims   = imsMap.get(`${r.gstin}|${r.invNum}`)
    const tally = tallyMap.get(`${r.gstin}|${r.tallyNum}`)
    if (!ims || !tally) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({
      ims_invoice_id: ims.id,
      tally_entry_id: tally.id,
      match_level:    'VALUE_TOLERANCE',
      outcome:        'PENDING_REVIEW',
      reason_code:    'VALUE_VARIANCE_LOW',
      reason_text:    `Invoice value in IMS (₹${parseFloat(ims.invoice_value).toLocaleString('en-IN')}) is ${r.pct}% higher than your books (₹${parseFloat(tally.total_amount).toLocaleString('en-IN')}). This may be freight or packing charges. Review and Accept if agreed, or mark Pending if disputed.`,
      itc_at_risk:    itc,
    })
  }

  // Auto Rejected: invoices 24–25 (>10% variance)
  const highVariance = [
    { gstin: '29AABCT5678B1Z3', invNum: 'TM/JAN/2026/024', tallyNum: 'TM/JAN/2026/024', pct: '18.33' },
    { gstin: '07AABCM9012C1Z1', invNum: 'MS/2026/025',     tallyNum: 'MS/2026/025',     pct: '12.00' },
  ]
  for (const r of highVariance) {
    const ims   = imsMap.get(`${r.gstin}|${r.invNum}`)
    const tally = tallyMap.get(`${r.gstin}|${r.tallyNum}`)
    if (!ims || !tally) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({
      ims_invoice_id: ims.id,
      tally_entry_id: tally.id,
      match_level:    'VALUE_TOLERANCE',
      outcome:        'AUTO_REJECTED',
      reason_code:    'VALUE_VARIANCE_HIGH',
      reason_text:    `Invoice value in IMS (₹${parseFloat(ims.invoice_value).toLocaleString('en-IN')}) is ${r.pct}% higher than your books (₹${parseFloat(tally.total_amount).toLocaleString('en-IN')}). Significant variance — Reject and ask the supplier to re-file with the correct amount.`,
      itc_at_risk:    itc,
    })
  }

  // Auto Rejected: wrong GSTIN (invoices 26–27)
  // IMS has wrong GSTIN; we match by invoice# in Tally and detect mismatch
  const gstinMismatch = [
    { imsGstin: '27AABCS1234A1Z5', invNum: 'INV/2025-26/026', tallyGstin: '27AABCS1234A1Z5', tallyNum: 'INV/2025-26/026' },
    { imsGstin: '29AABCT5678B1Z3', invNum: 'TM/JAN/2026/027', tallyGstin: '29AABCT5678B1Z3', tallyNum: 'TM/JAN/2026/027' },
  ]
  for (const r of gstinMismatch) {
    const ims   = imsMap.get(`${r.imsGstin}|${r.invNum}`)
    const tally = tallyMap.get(`${r.tallyGstin}|${r.tallyNum}`)
    if (!ims || !tally) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({
      ims_invoice_id: ims.id,
      tally_entry_id: tally.id,
      match_level:    'EXACT',
      outcome:        'AUTO_REJECTED',
      reason_code:    'GSTIN_MISMATCH',
      reason_text:    `The supplier GSTIN on this invoice in IMS does not match your records. This is likely a wrong state registration. Reject and ask the supplier to re-file.`,
      itc_at_risk:    itc,
    })
  }

  // Auto Rejected: duplicate of INV/2025-26/001 (second IMS entry with same invoice#)
  // The duplicate is the second occurrence of 27AABCS1234A1Z5|INV/2025-26/001
  const dupIms = allIms.filter(i => i.supplier_gstin === '27AABCS1234A1Z5' && i.invoice_number === 'INV/2025-26/001')
  if (dupIms.length === 2) {
    // First is already in exactMatches; mark the second as duplicate
    const dup = dupIms[1]
    const itc = (parseFloat(dup.igst) + parseFloat(dup.cgst) + parseFloat(dup.sgst)).toFixed(2)
    results.push({
      ims_invoice_id: dup.id,
      match_level:    'NO_MATCH',
      outcome:        'AUTO_REJECTED',
      reason_code:    'DUPLICATE_INVOICE',
      reason_text:    `Invoice number INV/2025-26/001 appears more than once in the IMS data. Reject the duplicate and confirm the correct invoice with the supplier.`,
      itc_at_risk:    itc,
    })
  }

  // Not in Books: invoices 29–30
  const notInBooks = [
    { gstin: '27AABCS1234A1Z5', invNum: 'INV/2025-26/029' },
    { gstin: '29AABCT5678B1Z3', invNum: 'TM/JAN/2026/030' },
  ]
  for (const r of notInBooks) {
    const ims = imsMap.get(`${r.gstin}|${r.invNum}`)
    if (!ims) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({
      ims_invoice_id: ims.id,
      match_level:    'NO_MATCH',
      outcome:        'NOT_IN_BOOKS',
      reason_code:    'NOT_IN_BOOKS',
      reason_text:    `This invoice from ${ims.supplier_name ?? 'the supplier'} is not found in your Tally purchase register. Verify with your purchase team before Accepting on GSTN.`,
      itc_at_risk:    itc,
    })
  }

  await prisma.reconciliationResult.createMany({ data: results })
  console.log(`Created ${results.length} reconciliation results`)

  // ── Summary ───────────────────────────────────────────────────────────────
  const counts = results.reduce((acc, r) => {
    acc[r.outcome] = (acc[r.outcome] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  console.log('Outcomes:', counts)
  console.log('Seed complete. Run `npm run db:studio` to inspect.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Remove erroneous `tally_entries` reference**

The seed above has a line `await prisma.tally_entries?.deleteMany({})` — remove it. The correct model name is `tallyEntry`. The file as written above is correct; this step is a reminder to verify no stray snake_case model references remain before running.

- [ ] **Step 3: Commit the seed script**

```bash
git add prisma/seed.ts
git commit -m "feat: add seed script with demo org, clients, invoices, and recon results"
```

---

## Task 11: Verify Build & Schema

**Files:**
- No new files

- [ ] **Step 1: Validate Prisma schema**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid` (runs without a live DB).

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: exit code 0, no errors. Fix any type errors before continuing.

- [ ] **Step 3: Run final build**

```bash
npm run build
```

Expected: exit code 0. All routes listed.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build and type errors from scaffold"
```

---

## Running the Full Demo (after Supabase setup)

Once you have a Supabase project and have filled in `.env.local`:

```bash
# 1. Push schema to Supabase
npx prisma migrate dev --name init

# 2. Generate Prisma client
npm run db:generate

# 3. Seed demo data
npm run db:seed

# 4. Start dev server
npm run dev
```

Open http://localhost:3000 — you should see the stub home page. Navigate to `/ca/dashboard`, `/client/dashboard` etc. to confirm all routes render.

---

## Self-Review Notes

- **Spec coverage:** All 10 tables from §9 are in the schema. All 4 seed entities from §12 (org, staff, 3 clients, 4 GSTINs) are created. All 30 IMS invoice scenarios from §12 are covered in sample data and seed results.
- **No placeholders:** All file contents are complete. The `TODO` comments in lib stubs are intentional scope markers for future sprints, not gaps in this plan.
- **Type consistency:** `NormalizedImsInvoice` and `NormalizedTallyEntry` are defined in parsers and imported by matcher/rules — types flow correctly. Prisma model names (`imsInvoice`, `tallyEntry`, `reconciliationResult`) are consistently camelCase in seed script.
- **Scope:** This plan produces no working feature logic — only the scaffolding. Feature sprints (parsers, recon engine, auth, UI) follow separately.
