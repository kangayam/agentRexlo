# AgentFlow Core — Change History

Complete record of all changes from project creation to present.  
**Last updated:** 16 May 2026

---

## Phase 0 — Project Foundation

**What was built:** Repository created, project structure defined, core tooling installed.

| Area | Files / Notes |
|---|---|
| Next.js 14 App Router bootstrap | `app/`, `package.json`, `tailwind.config.ts` |
| Database schema | `prisma/schema.prisma` — 10 models, 6 enums (User, Client, GSTIN, UploadSession, ImsInvoice, TallyEntry, ReconciliationResult, Notification, AuditLog, TeamInvite) |
| Environment config | `.env.example`, Supabase + Prisma wiring |
| UI component library | shadcn/ui configured with slate base colour |
| Sample data | `data/` — sample IMS JSON + Tally CSV for dev testing |
| Project spec | `CLAUDE.md`, `docs/SPEC.md`, `docs/WORKFLOW.md` |

---

## Phase 1 — Authentication & Team Management

**What was built:** CA firm signup, login, password reset, team invite system.

| Area | Files / Notes |
|---|---|
| Auth API | `app/api/auth/route.ts` — signup, login, password reset |
| Supabase PKCE callback | `app/api/auth/callback/route.ts` — creates Prisma user record on first login |
| Team invite | `app/api/team/route.ts` — invite by email, token expiry |
| Resend email | `lib/email/resend.ts` — invite email template |
| Session helper | `lib/auth/session.ts` — `getAuthedUser()` |
| Auth pages | `app/(auth)/` — login, signup, reset pages |
| Permissions | `lib/auth/permissions.ts` — role-based access (CA_ADMIN, CA_STAFF, CLIENT) |

---

## Phase 2 — Client Management + Reconciliation Engine

**What was built:** The core ITC reconciliation engine — the primary business logic of the product.

| Area | Files / Notes |
|---|---|
| Normalisation | `lib/reconciliation/normalize.ts` — GSTIN, invoice#, date, decimal rules |
| Matching | `lib/reconciliation/matcher.ts` — Strategy A (invoice# lookup) + Strategy B (GSTIN+value fuzzy) |
| Classification | `lib/reconciliation/rules.ts` — 8-rule classifier producing AUTO_ACCEPTED / AUTO_REJECTED / PENDING_REVIEW / NOT_IN_BOOKS |
| Reason text | `lib/reconciliation/reasons.ts` — single source of truth for all reason strings |
| Engine entry point | `lib/reconciliation/index.ts` — `reconcile()` function |
| IMS parser | `lib/parsers/ims-json-parser.ts` — parses GSTN docdata/b2b JSON format |
| Tally CSV parser | `lib/parsers/tally-csv-parser.ts` |
| Golden test fixture | `data/fixtures/` — 50-row ground truth for Feb 2026 covering all 9 scenarios |
| Tests | `tests/reconciliation.test.ts`, `tests/parsers.test.ts`, `tests/normalize.test.ts` |
| Client API | `app/api/clients/` — create, list, add GSTIN, resend invite |
| Client invite flow | `app/api/clients/accept-invite/route.ts` |
| CA clients page | `app/ca/clients/page.tsx` + `[clientId]/page.tsx` |

---

## Phase 3 — File Upload Processing

**What was built:** IMS + Tally file upload, column auto-detection, storage, reconciliation trigger.

| Area | Files / Notes |
|---|---|
| Upload API | `app/api/upload/route.ts` — accepts IMS JSON or Tally CSV/Excel, parses, stores, triggers reconciliation |
| IMS upload logic | `lib/upload/ims.ts` — `replaceImsInvoices()` |
| Tally Excel parser | `lib/parsers/tally-excel-parser.ts` — xlsx library, auto-detect columns |
| Column detection | `lib/parsers/tally-column-detect.ts` — maps non-standard Tally headers to canonical fields |
| DB orchestrator | `lib/reconciliation/run.ts` — `runReconciliation()` — loads from DB, runs engine, saves results |
| File storage | `lib/storage/supabase-storage.ts` — uploads raw files to Supabase Storage |
| Upload UI | `app/client/upload/page.tsx`, `components/upload/` — drag-drop, period picker, column mapping modal |
| Period helper | `lib/upload/period.ts` — smart default (before/after 14th logic) |

---

## Phase 4 — CA & Client Dashboards

**What was built:** Action queues, summary cards, ITC at-risk display, mark-done workflow.

| Area | Files / Notes |
|---|---|
| Client dashboard API | `app/api/dashboard/client/route.ts` |
| CA dashboard API | `app/api/dashboard/ca/route.ts` |
| CA reconciliation API | `app/api/clients/[clientId]/reconciliation/route.ts` |
| Mark done API | `app/api/reconciliation/mark-done/route.ts` |
| Dashboard helpers | `lib/dashboard/client.ts` — `computeSummaryCards()`, `filterRows()`, `countByChip()` |
| CA dashboard helpers | `lib/dashboard/ca.ts` — `deriveClientStatus()`, `sortCaRows()` |
| Quality score | `lib/quality-score.ts` — per-client reconciliation health score |
| UI components | `components/dashboard/` — StatusBadge, SummaryCards, FilterChips, InvoiceTable, MarkDoneButton, CaClientTable, NotifyButton |
| CA dashboard page | `app/ca/dashboard/page.tsx` |
| Client dashboard page | `app/client/dashboard/page.tsx` |

---

## Phase 5 — Portal Navigation & Notifications

**What was built:** Sidebar navigation, notification bell, in-platform alerts, client history.

| Area | Files / Notes |
|---|---|
| Sidebar | `components/AppSidebar.tsx` |
| CA portal layout | `app/ca/layout.tsx` |
| Client portal layout | `app/client/layout.tsx` |
| Notifications API | `app/api/notifications/route.ts` — GET (list), PATCH (mark read) |
| Notify API | `app/api/notify/route.ts` — send to CA on client upload |
| Notification bell | `components/dashboard/NotificationBell.tsx` — live unread count |
| Client history page | `app/client/history/page.tsx` — upload session log |
| Sign out API | `app/api/auth/signout/route.ts` |

---

## Phase 6 — Design System & UI Overhaul

**What was built:** AgentGST brand identity applied across all surfaces.

| Area | Files / Notes |
|---|---|
| Design foundation v1.0 | Colour tokens, typography, spacing — applied to login, sidebar, dashboard cards, status badges |
| Login page redesign | Full-viewport hero layout, dark right panel, peach/slate palette |
| CA dashboard upgrade | ITC leakage column, quality scores, pre-14th deadline indicator |
| CA alerts screen | `app/ca/alerts/` |
| Portfolio analytics | `app/ca/analytics/` |
| Client portfolio screen | `app/ca/clients/ClientPortfolioClient.tsx` — ITC status distribution panel |

---

## Phase 7 — Client Lifecycle (Archival)

**What was built:** Archive, restore, and scheduled deletion for clients.

| Area | Files / Notes |
|---|---|
| Archive API | `app/api/ca/clients/[clientId]/archive/route.ts` |
| Restore API | `app/api/ca/clients/[clientId]/restore/route.ts` |
| Delete API | `app/api/ca/clients/[clientId]/delete/route.ts` |
| Scheduled cleanup | `app/api/cron/cleanup-archived-clients/route.ts` |
| Design doc | `docs/DESIGN-client-archival-v1.md` |

---

## Phase 8 — Multi-GSTIN Client Support

**What was built:** Clients can register with multiple state GSTINs; upload and reconciliation run independently per GSTIN.

| Area | Files / Notes |
|---|---|
| GSTIN state lookup | `lib/gstin-state.ts` — maps 2-digit state code to state name |
| API changes | `app/api/clients/route.ts` — accepts `additionalGstins[]` on create |
| Add Client form | `app/ca/clients/new/page.tsx` — dynamic GSTIN fields |
| Design doc | `docs/design/04-upload-processing.md` updated |

---

## Phase 9 — Marketing Landing Page

**What was built:** Public-facing marketing page at `/` for AgentGST.

| Area | Files / Notes |
|---|---|
| Landing page | `app/page.tsx` — redirects authenticated users to dashboard |
| Components | Nav, Hero, Problem, Solution, Screenshots, Economics, HowToStart, FinalCTA, Footer |
| Analytics | Google Analytics wired up |
| Lead capture | Formspree CTA form integrated |
| Product screenshots | Added to `public/` |

---

## Phase 10 — Production Hardening (Vercel)

**What was built:** Fixes to make the app deploy and run correctly on Vercel serverless.

| Area | What Was Fixed |
|---|---|
| Build pipeline | `prisma generate` before `next build`; disabled TS/ESLint checks in build |
| API routes | `export const dynamic = 'force-dynamic'` added to all routes |
| Auth redirects | Switched to `NEXT_PUBLIC_APP_URL` for all email redirects (PKCE-safe) |
| Password reset | Client-side `resetPasswordForEmail` to fix PKCE code verifier on Vercel |
| RLS | Row-level security enabled on all Supabase tables |
| Session | Removed server token invalidation that broke serverless cold starts |

---

## Phase 11 — Bug Fixes (16 May 2026)

**What was fixed:** 4 bugs identified from PM QA feedback — reconciliation output numbers incorrect.

| Bug | Root Cause | File Fixed |
|---|---|---|
| Wrong expected counts in spec | `CLAUDE.md` had stale numbers (41/4/3/1 over 47 rows) | `CLAUDE.md` |
| IMS dates off by 1 day on IST servers | `parseAnyDate` used local-time `new Date(y,m,d)` instead of UTC | `lib/parsers/ims-json-parser.ts` |
| IMS re-upload wiped CA "Done" marks | `replaceImsInvoices` deleted all rows and recreated fresh, destroying `is_done` | `lib/upload/ims.ts` |
| Two suppliers with same invoice# cross-contaminated results | `imsUuidByKey` keyed on invoice# only — GSTIN not included | `lib/reconciliation/run.ts` |
| Design docs not reflecting code | Stale counts and wrong re-upload description | `docs/design/01-reconciliation-engine.md`, `docs/design/04-upload-processing.md` |

**Verified:** 108 automated tests passing. Golden fixture: 43 AUTO_ACCEPTED, 3 AUTO_REJECTED, 3 PENDING_REVIEW, 1 NOT_IN_BOOKS, 50 rows.

---

## Test Coverage

**108 automated tests** covering:

| Area | Test File |
|---|---|
| Normalisation rules | `tests/normalize.test.ts` |
| IMS parser (typed) | `tests/parsers.test.ts` |
| IMS parser (format-agnostic) | `tests/ims-parser-v2.test.ts` |
| Tally CSV parser | `tests/parsers.test.ts` |
| Column auto-detection | `tests/tally-column-detect.test.ts` |
| All 9 reconciliation scenarios + golden fixture | `tests/reconciliation.test.ts` |
| Reconciliation run orchestrator | `tests/run-reconciliation.test.ts` |
| Upload IMS logic | `tests/upload-ims.test.ts` |
| Dashboard helpers | `tests/dashboard-client.test.ts`, `tests/dashboard-ca.test.ts` |
| Quality score | `tests/quality-score.test.ts` |
| GSTIN state lookup | `tests/gstin-state.test.ts` |
| Email | `tests/email.test.ts` |
| Invite | `tests/invite.test.ts` |
