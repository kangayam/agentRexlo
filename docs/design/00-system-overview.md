# AgentGST — System Overview
**Type:** High-Level Design (HLD)  
**Audience:** All — developers, CA firm partners, investors  
**Last updated:** 2026-05-15  

---

## What AgentGST Does (Plain English)

Every month, businesses in India must reconcile the GST invoices their suppliers uploaded to the government portal (GSTN) against the invoices recorded in their own accounting software (Tally). This is called ITC reconciliation — "ITC" is the tax credit businesses can claim back.

Doing this manually takes a CA firm 80+ hours per month across all clients. AgentGST automates it:

1. The client uploads two files: the government's invoice list (IMS JSON) and their Tally purchase register (CSV/Excel)
2. AgentGST matches the two lists and classifies every invoice — accepted, rejected, needs review, or missing
3. The CA sees a prioritised action queue and health scores for every client
4. The client sees a plain-English breakdown of their ITC risk and what to do about it

---

## Who Uses It

| Role | Who they are | What they do in AgentGST |
|---|---|---|
| **CA_ADMIN** | Senior CA / firm partner | Manages all clients, archives, full access |
| **CA_STAFF** | Junior CA / team member | Views clients, triggers reconciliation, sends reminders |
| **CLIENT** | Business owner / accountant | Uploads files, views their own dashboard, takes GSTN actions |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser                           │
│  CA Portal (/ca/*)          Client Portal (/client/*)│
└──────────────┬──────────────────────┬───────────────┘
               │ HTTPS                │ HTTPS
┌──────────────▼──────────────────────▼───────────────┐
│              Next.js 14 (App Router)                 │
│   Server Components + API Routes (/api/*)            │
│   Deployed on Vercel (auto-deploy from master)       │
└──────┬──────────────┬──────────────────┬────────────┘
       │              │                  │
┌──────▼──────┐ ┌─────▼──────┐ ┌────────▼────────────┐
│  Supabase   │ │  Supabase  │ │   Supabase Storage  │
│  Auth       │ │  Postgres  │ │   (uploaded files)  │
│  (sessions) │ │  via Prisma│ └─────────────────────┘
└─────────────┘ └────────────┘
```

**Key principle:** All database access goes through Prisma ORM using a direct connection string. The Supabase Data API (PostgREST) is not used — only Supabase Auth and Storage.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend + API | Next.js 14 App Router + TypeScript | Server components, API routes, one deployment |
| UI | Tailwind CSS + shadcn/ui | Design system with no runtime overhead |
| Database | PostgreSQL via Supabase | Managed Postgres with auth built in |
| ORM | Prisma | Type-safe queries, migration history |
| Auth | Supabase Auth | Email + password, session cookies |
| File storage | Supabase Storage | Uploaded IMS JSON and Tally files |
| Money math | Decimal.js | Precise decimal arithmetic for ITC values |
| Deployment | Vercel | Auto-deploy on push to master |
| Scheduled jobs | Vercel Cron | Daily cleanup of expired archived clients |

---

## Key Data Flows

### Upload and Reconcile
```
Client uploads IMS JSON + Tally CSV
        ↓
Files stored in Supabase Storage
        ↓
Parsers normalise both files (GSTIN uppercase, invoice# stripped,
  dates to ISO 8601, values to 2 decimal places)
        ↓
Reconciliation engine matches IMS invoices to Tally entries
  Strategy A: exact normalised invoice number
  Strategy B: same GSTIN + value within 2% (fallback)
        ↓
Each invoice classified: AUTO_ACCEPTED / AUTO_REJECTED /
  PENDING_REVIEW / NOT_IN_BOOKS
        ↓
Results stored in ReconciliationResult table
        ↓
CA and client dashboards read results and compute scores
```

### CA Monthly Workflow
```
CA logs in → Client Portfolio (/ca/clients)
  → sees quality score + ITC at risk per client
  → clicks into client → Analytics / Reconciliation tabs
  → sends reminder to client if action needed
  → marks items Done after client acts on GSTN
```

### Client Monthly Workflow
```
Client logs in → GST Dashboard (/client/dashboard)
  → sees health score + what's at risk and why
  → uploads IMS JSON (from GSTN portal)
  → uploads Tally data (exported from Tally)
  → takes actions on GSTN (Accept/Reject invoices)
```

---

## Folder Structure

```
app/                  Next.js pages + API routes
  (auth)/             Login, signup, reset password
  ca/                 CA portal
  client/             Client portal
  api/                API route handlers

lib/                  Business logic (no framework dependency)
  auth/               Session helpers, permissions
  parsers/            IMS JSON parser, Tally CSV/Excel parser
  reconciliation/     Normalize, match, classify, run
  quality-score.ts    Single canonical quality score function
  notifications/      In-platform notification creation
  upload/             IMS replace logic, period helpers
  db/                 Prisma client

prisma/               schema.prisma + migrations
components/           React components
docs/design/          This documentation set
tests/                Unit tests (reconciliation + quality score)
data/fixtures/        Golden test set (47 invoices, known outcomes)
```

---

## What Is Not Built Yet (Phase 2+)

- Direct GSTN API integration — currently manual file upload
- AI/LLM fuzzy matching — currently rule-based only
- Email and WhatsApp notifications — in-platform only for now
- GSTR-2B post-14th reconciliation
- GSTR-3B generation
- Mobile app

---

## Design Documents Index

| # | Document | Covers |
|---|---|---|
| 00 | **System Overview** (this file) | Architecture, stack, data flows |
| 01 | Reconciliation Engine | Normalise → match → classify pipeline |
| 02 | Quality Score | Formula, components, band thresholds |
| 03 | Client Lifecycle | Archive → restore → auto-delete |
| 04 | Upload Processing | IMS JSON + Tally parsing, session states |
| 05 | Auth & Permissions | Roles, what each can do, session handling |
| 06 | ITC Calculations | How ITC cleared, at risk, blocked are computed |
| 07 | Notifications | Types, triggers, deduplication |
