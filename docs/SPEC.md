# AgentFlow Core — Product Specification

**An AI-powered ITC (Input Tax Credit) decision engine for Chartered Accountants in India**

> Version 1.0 · Non-technical founder edition · Phase 1 (MVP) focus

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [Product Vision & Positioning](#3-product-vision--positioning)
4. [Phased Roadmap (6 Months)](#4-phased-roadmap-6-months)
5. [Phase 1 MVP — Detailed Scope](#5-phase-1-mvp--detailed-scope)
6. [User Personas & User Stories](#6-user-personas--user-stories)
7. [Modular System Architecture](#7-modular-system-architecture)
8. [Tech Stack (Simple Edition)](#8-tech-stack-simple-edition)
9. [Data Model](#9-data-model)
10. [Reconciliation Engine Logic](#10-reconciliation-engine-logic)
11. [UI Screens (Figma Scope)](#11-ui-screens-figma-scope)
12. [Dummy Data Plan](#12-dummy-data-plan)
13. [Success Metrics](#13-success-metrics)
14. [What We Are NOT Building (MVP)](#14-what-we-are-not-building-mvp)

---

## 1. Executive Summary

AgentFlow Core helps Chartered Accountants in India automate Input Tax Credit (ITC) reconciliation for their SME clients. A CA managing 50–200 clients today spends 3–4 hours per client every month matching GSTR-2B / IMS invoices against Tally purchase registers in Excel. We replace that workflow with a single dashboard that auto-reconciles the data, surfaces only the exceptions that need human judgment, and tracks whether each action has been taken on the GSTN portal.

**Phase 1 (MVP) delivers a working CA-first web app:** CA firms manage clients, clients (or CAs on their behalf) upload two files — IMS JSON + Tally Excel — the system produces an action queue in plain English, and the CA gets a consolidated view of ITC at risk across all clients.

**Not in Phase 1:** direct GSTN API integration, vendor follow-up automation, GSTR-3B auto-filing, mobile app. Those come in Phases 2 and 3.

---

## 2. The Problem We're Solving

Based on your uploaded CA interviews and workflow documents:

- A typical SME has 200–300 IMS invoices per month that must be reviewed and actioned before GSTR-3B filing.
- Current process: export IMS data from GSTN → export purchase register from Tally → VLOOKUP in Excel → identify mismatches → act on each one manually on the GSTN portal.
- CAs manage 50–200 clients, repeating this loop each month. No consolidated view exists.
- ₹8–12 lakh of ITC is blocked per client per month due to missed or wrongly actioned invoices.
- GSTR-2B generates on the 14th. Anything not actioned by then is "deemed accepted," including wrong invoices. This has legal and financial consequences.
- The 2026 regulatory changes (3-year time bar, stricter ITC validation, auto late fees) make manual processes risky.

AgentFlow Core compresses the 3–4 hour per-client effort into minutes.

---

## 3. Product Vision & Positioning

**Vision:** Every CA firm in India runs their ITC reconciliation on AgentFlow Core. The CA becomes a strategic advisor instead of a data operator.

**Positioning:** We are not ClearTax, not Tally, not a filing tool. We are a **decision engine for CAs** that sits between the client's books and the GSTN portal. Think "Superhuman for GST reconciliation" — CA-focused, workflow-first, fast.

**Wedge:** IMS reconciliation is new (Oct 2024), painful, monthly, and has a hard deadline (the 14th). Every CA feels this pain, and no existing tool is purpose-built for the CA's multi-client workflow. We own that wedge first, then expand.

---

## 4. Phased Roadmap (6 Months)

Each phase ships a working product. Later phases layer on top without rewrites — the modular architecture in Section 7 is what makes this possible.

### Phase 1 — MVP: IMS Reconciliation (Weeks 1–8)

**Goal:** A CA can onboard a client, upload IMS + Tally data, and produce an action queue. All in the browser, no spreadsheets.

Scope:
- CA firm sign-up, client creation, client invite
- File upload: IMS JSON and Tally Excel/CSV
- Rule-based reconciliation engine (2-way match: IMS vs Tally)
- Client action queue dashboard with plain-English reasons
- CA multi-client dashboard showing ITC at risk per client
- "Mark Done on GSTN" tracking
- Basic in-platform notifications

Exit criteria: 3–5 real CA firms using it with ≥3 clients each, processing ≥1 full month of data, reporting ≥50% time savings.

### Phase 2 — Vendor Follow-ups & GSTR-2B Recon (Weeks 9–16)

Layered on top of Phase 1:
- Automated vendor follow-up emails (Day 7 / 9 / 10 templates from your docs)
- WhatsApp integration (via Twilio or Gupshup)
- Vendor compliance scoring dashboard
- GSTR-2B download vs IMS reconciliation (post-14th flow)
- Supplier risk dashboard per CA client
- AI-assisted fuzzy matching for invoice numbers and vendor names (LLM layer on top of rule engine — not replacing it)

### Phase 3 — GSTN Integration & Returns Automation (Weeks 17–24)

- Direct GSTN API integration (auto-fetch IMS, auto-submit actions) — requires GSP partnership
- GSTR-3B auto-generation with pre-filing validation
- Tally direct integration (pull purchase register via Tally ODBC or official connector)
- CA analytics: firm-wide trends, high-risk clients, revenue forecasting
- Mobile-responsive web (not native app yet)

---

## 5. Phase 1 MVP — Detailed Scope

This is what you build first. Every feature below maps to a user story in Section 6.

### Feature Group A: Accounts & Onboarding

| Feature | Description |
|---|---|
| CA firm sign-up | Firm name, email, password (min 8 chars), email OTP verification |
| CA login | Email + password; 5 failed attempts = 15 min lockout |
| Forgot / reset password | Reset email with 1-hour single-use link; constant-response to prevent email enumeration |
| CA team member invite | Admin invites Staff by email; 7-day setup link; Admin / Staff role |
| Add client | Firm name, primary GSTIN (15-char validation), contact email, invite email to client |
| Add multiple GSTINs per client | One client can have multiple GSTINs (multi-state businesses) |
| Client setup | Client clicks invite link, sets name + password, logs in automatically |

### Feature Group B: Data Upload

| Feature | Description |
|---|---|
| IMS JSON upload | Accept GSTN IMS export JSON; validate structure (`docdata.b2b`); select period + GSTIN |
| Tally Excel/CSV upload | Accept purchase register; auto-detect common column names; fall back to manual column mapping UI |
| Re-upload behavior (IMS) | Additive: new invoices added, invoices already "Done" preserved, diff count shown |
| Re-upload behavior (Tally) | Replace-all: last upload wins since Tally exports are always full registers |
| Upload on behalf of client | CA can switch to "acting as client" mode; all actions logged with CA attribution |
| Upload history | See every upload with timestamp and who uploaded it |

### Feature Group C: Reconciliation Engine

Runs automatically on every upload. Rule-based, no AI in Phase 1. Full specification in Section 10.

Every IMS invoice receives one of four results:
- **AUTO_ACCEPTED** — perfect or within 2% tolerance match → no action needed
- **AUTO_REJECTED** — wrong GSTIN, duplicate, or value >10% higher → client should Reject on GSTN
- **PENDING_REVIEW** — 2–10% value variance or soft invoice# match → client must review
- **NOT_IN_BOOKS** — in IMS but not in Tally → client must verify with purchase team

### Feature Group D: Client Dashboard

The hero screen for the client. Four tabs:
1. Action Required (main queue)
2. Flagged for Rejection
3. Not in Books
4. Auto-Matched (collapsed, for reference + Excel export)

Each row shows vendor, invoice number, value, ITC amount, plain-English reason, and a "Mark Done on GSTN" button.

Top-of-dashboard summary shows: ₹ Safe, ₹ At Risk, ₹ Blocked, ₹ Unverified, with counts.

### Feature Group E: CA Multi-Client Dashboard

A table of all clients for the current period:

| Client | GSTIN count | ITC at risk | Pending actions | Status | Action |
|---|---|---|---|---|---|

Status values: Urgent (>₹5L at risk or <3 days to deadline), Pending, All done, No upload.

CA can click "Notify" to send an in-platform alert to the client. CA can click "View" to enter the client's dashboard in read-only or "acting as" mode.

### Feature Group F: Notifications

In-platform bell icon with unread count. Four triggers:
- CA notifies client of pending actions
- Client completes all items
- Client uploads new data (CA gets ping)
- Upload validation fails (uploader gets error)

No email or WhatsApp in MVP — those are Phase 2.

---

## 6. User Personas & User Stories

### Persona 1: Rajesh — Senior CA (Primary user)

Runs a CA firm with 80 SME clients. Has 2 junior staff. Logs in daily during the 10th–20th window. Wants a one-screen summary of who needs chasing and who's done.

### Persona 2: Amit — Client CFO (Secondary user)

CFO at a ₹25 Cr manufacturing firm. Gets into the platform 2–3 times a month. Wants the shortest possible list of "what do I do on GSTN right now?"

### User stories — Phase 1 (selected, highest-priority)

**CA stories:**
- As a CA, I add a new client with name + GSTIN + email, and they get an invite email.
- As a CA, I see all my clients for the current month with ITC-at-risk, sorted by risk.
- As a CA, I click into any client and see their full reconciliation in read-only mode.
- As a CA, I upload IMS + Tally files on behalf of a client who can't manage the upload themselves.
- As a CA, I invite a junior staff member with Staff role — they can upload but not notify clients.
- As a CA, I notify a client with one click when their action queue has items.

**Client stories:**
- As a client, I upload my IMS JSON and my Tally Excel, and the system tells me what to do.
- As a client, I see a clear summary: ₹ safe, ₹ at risk, ₹ blocked, with counts.
- As a client, I see each pending invoice with a plain-English reason and a suggested action.
- As a client, I click "Mark Done on GSTN" after I take action on the GSTN portal, and my CA sees progress.
- As a client, I re-upload a newer IMS export mid-month and my completed actions are preserved.

---

## 7. Modular System Architecture

Everything is organised into modules so Phase 2 and Phase 3 features slot in without rewrites. Each module has a clear boundary (a folder + a few files) and a clear contract (the functions it exposes).

```
agentflow-core/
├── app/                          # Next.js App Router — UI pages
│   ├── (auth)/                   # Login, signup, reset password
│   ├── ca/                       # CA portal pages
│   │   ├── dashboard/            # Multi-client view
│   │   ├── clients/              # Client management
│   │   └── team/                 # Team member management
│   ├── client/                   # Client portal pages
│   │   ├── dashboard/            # IMS action queue
│   │   ├── upload/               # Upload center
│   │   └── history/              # Previous periods
│   └── api/                      # API routes (backend)
│       ├── auth/
│       ├── clients/
│       ├── upload/
│       └── reconciliation/
│
├── lib/                          # Core business logic (framework-agnostic)
│   ├── auth/                     # Session helpers, permission checks
│   ├── parsers/                  # [Module] File parsers
│   │   ├── ims-json-parser.ts    # GSTN IMS JSON → normalised invoices
│   │   └── tally-excel-parser.ts # Tally Excel/CSV → normalised entries
│   ├── reconciliation/           # [Module] Recon engine
│   │   ├── normalize.ts          # GSTIN, invoice#, value normalisation
│   │   ├── matcher.ts            # Level 1 / 2 / 3 matching
│   │   ├── rules.ts              # Auto-accept / reject / review rules
│   │   └── reasons.ts            # Plain-English reason templates
│   ├── notifications/            # [Module] Notifications (swappable)
│   │   ├── in-platform.ts        # Phase 1: in-platform only
│   │   └── index.ts              # Uniform interface; email/whatsapp plug in later
│   ├── storage/                  # [Module] File storage abstraction
│   └── db/                       # Prisma client + DB helpers
│
├── prisma/
│   └── schema.prisma             # Database schema (see Section 9)
│
├── components/                   # React UI components
│   ├── ui/                       # shadcn/ui base components
│   ├── dashboard/                # Dashboard-specific components
│   ├── upload/                   # Upload widgets
│   └── tables/                   # Data tables
│
├── public/                       # Static assets
│
├── docs/
│   ├── SPEC.md                   # This document
│   ├── WORKFLOW.md               # Dev workflow (Claude Code + Figma + GitHub)
│   └── CLAUDE.md                 # Context file for Claude Code
│
├── data/                         # Sample & test data
│   └── fixtures/                 # Golden reconciliation test set (see FIXTURES.md)
│       ├── 27AABCU9603R1ZX-ims-2026-02.json
│       ├── 27AABCU9603R1ZX-tally-2026-02.csv
│       ├── 27AABCU9603R1ZX-recon-expected-2026-02.csv
│       └── FIXTURES.md
│
└── tests/                        # Basic unit tests for recon engine
```

**Why this layout matters for you as a non-technical founder:**

Each folder in `lib/` is a module — a self-contained Lego brick. When you say "add WhatsApp notifications in Phase 2," the work happens inside `lib/notifications/` only. No other module needs to change. When you say "add AI fuzzy matching in Phase 2," the work happens inside `lib/reconciliation/` only.

You will tell Claude Code: "Add a new file `lib/notifications/whatsapp.ts` that implements the same interface as `in-platform.ts`." Claude Code will do it, and nothing else breaks. That is what modular means in practice.

---

## 8. Tech Stack (Simple Edition)

Chosen for: free to start, well-known to Claude Code, easy to deploy, scales when you have paying customers.

| Layer | Choice | Why |
|---|---|---|
| **Frontend + Backend (one codebase)** | Next.js 14 (App Router) + TypeScript | One framework for UI + API. Huge ecosystem. Claude Code is excellent with Next.js. |
| **UI components** | Tailwind CSS + shadcn/ui | Fast, consistent, easy to style from Figma designs |
| **Database** | PostgreSQL on Supabase | Free tier covers MVP. Postgres is standard. Supabase adds auth + file storage for free. |
| **Authentication** | Supabase Auth (or NextAuth.js) | Email + password out of the box. Free. |
| **File storage** | Supabase Storage | For uploaded IMS JSON and Tally files. Free tier is plenty for MVP. |
| **Hosting (frontend + API)** | Vercel | Free tier. Push to GitHub, Vercel deploys automatically. |
| **File parsing** | `papaparse` (CSV), `xlsx` (Excel) — npm packages | Standard tools, Claude Code knows them well |
| **Money handling** | `Decimal.js` npm package | Avoids floating-point rounding bugs in ITC math |
| **Code editor** | Visual Studio Code + Claude Code in its terminal | Your dev environment |
| **Design** | Figma | Where you mock screens; hand off to Claude Code |
| **Version control** | GitHub — `kangayam/agentflow-core` | Source of truth |
| **Background jobs (if needed)** | Vercel Cron for scheduled jobs | Free, simple |

**Total monthly cost for MVP:** ₹0 until you have paid users. Supabase and Vercel both have generous free tiers.

**Why not these alternatives:**
- Not React Native / Flutter: no mobile app needed for MVP; web-responsive is enough.
- Not Django / FastAPI: splitting frontend and backend adds complexity a non-technical founder doesn't need.
- Not Firebase: Postgres is more flexible for the relational data you have (clients → GSTINs → upload sessions → invoices).
- Not raw AWS: you will spend days configuring infra. Skip it until Phase 3.

---

## 9. Data Model

Main tables (simplified from your PRD). Built in Prisma; Prisma generates type-safe database code automatically.

```
organizations       — one row per CA firm
users               — CAs, Staff, and Client users
clients             — one row per client business
client_gstins       — one row per GSTIN (a client can have many)
upload_sessions     — one per period × GSTIN (e.g., "Jan 2026 for GSTIN-X")
ims_invoices        — parsed from uploaded IMS JSON
tally_entries       — parsed from uploaded Tally file
reconciliation_results  — one per IMS invoice: the auto-decision + reason + done status
notifications       — in-platform bell items
audit_log           — who did what, when (for compliance)
```

Full schema is in the PRD you shared and will be written in `prisma/schema.prisma`. The important design property: **row-level access** is enforced at the API layer — a CA from Firm A can never read data belonging to Firm B's clients.

---

## 10. Reconciliation Engine Logic

The heart of the product. Pure rule-based in Phase 1 — no AI, no fuzzy matching. This keeps it predictable, debuggable, and fast.

**The golden test fixtures for this engine live at `data/fixtures/` and are documented in `data/fixtures/FIXTURES.md`.** The 9 scenarios there (EXACT_MATCH, WRONG_GSTIN, NOT_IN_BOOKS, VALUE_OVER_10, VALUE_MISMATCH_2_10, FORMAT_VARIATION, INVOICE_NUMBER_MISMATCH, DATE_GAP, DUPLICATE) are the behavioural contract for the rules below. If you change a rule here, you update the expected fixture and the tests together.

### Step 1 — Normalise

Before matching anything, clean up the data:

- **GSTIN:** uppercase, trim spaces, validate 15-char alphanumeric.
- **Invoice number:** lowercase, strip `/ - _ \ # space`, drop leading zeros. `"INV/2026/001"`, `"INV-2026-001"`, and `"inv2026001"` all become `"inv202601"`.
- **Value:** round to 2 decimals, treat ±₹1 as equal.
- **Date:** parse both `DD-MM-YYYY` (IMS JSON convention) and `DD/MM/YYYY` (Tally CSV convention) into ISO 8601 (`YYYY-MM-DD`) before any comparison.
- **Tax amounts:** for IMS, sum item-level `iamt / camt / samt / csamt` across all `itms[]` entries for multi-line invoices.

### Step 2 — Detect duplicates in the IMS upload

Before matching, scan the IMS dataset for the same normalised invoice# appearing twice under the same supplier. Both copies are marked `DUPLICATE` → `AUTO_REJECTED` with reason *"Duplicate IMS entry — same invoice uploaded twice"*. They are excluded from the candidate pool below.

### Step 3 — Find candidate matches (two-stage lookup)

For each remaining IMS invoice, find candidate Tally entries using two lookup strategies and combine the results. **GSTIN is not part of the match key — it is a validation check in Step 4.** This is intentional: the `WRONG_GSTIN` scenario (same invoice#, same value, different GSTIN) must still match so the engine can flag the GSTIN mismatch instead of silently marking it `NOT_IN_BOOKS`.

- **Strategy A — Invoice# primary:** find Tally entries with the same normalised invoice#. (Catches EXACT_MATCH, FORMAT_VARIATION, WRONG_GSTIN, VALUE_OVER_10, VALUE_MISMATCH_2_10, DATE_GAP, DUPLICATE.)
- **Strategy B — Soft match:** find Tally entries with same GSTIN + value within 2% + same tax type, but a different invoice#. (Catches INVOICE_NUMBER_MISMATCH where the supplier and buyer use different invoice numbering conventions.)

If both strategies return zero candidates → **NOT_IN_BOOKS**.

If multiple candidates, pick the one with the smallest value delta, then closest date.

### Step 4 — Validate the match and classify

Run the selected candidate through a cascade of checks. The **first** check that fires determines the outcome. Order matters.

1. **GSTIN check.** If IMS GSTIN ≠ Tally GSTIN → **AUTO_REJECTED** with reason *"Supplier GSTIN mismatch — IMS: {imsGstin} / Tally: {tallyGstin}"*. (Scenario: WRONG_GSTIN.)
2. **Value delta check.** Compute `delta = (tallyValue − imsValue) / imsValue × 100`.
    - If `|delta| > 10%` → **AUTO_REJECTED** with reason *"Value delta: Tally ₹X vs IMS ₹Y ({sign}{delta}% — exceeds 10% threshold)"*. (Scenario: VALUE_OVER_10.)
    - If `2% < |delta| ≤ 10%` → **PENDING_REVIEW** with reason *"Value delta: Tally ₹X vs IMS ₹Y ({sign}{delta}% — within 2–10% band)"*. (Scenario: VALUE_MISMATCH_2_10.)
3. **Invoice# soft-match check.** If the match came via Strategy B (different normalised invoice#) → **PENDING_REVIEW** with reason *"Invoice# mismatch — IMS: '{imsInv}' / Tally: '{tallyInv}'"*. (Scenario: INVOICE_NUMBER_MISMATCH.)
4. **Tax-type check.** If IMS declares IGST but Tally declares CGST+SGST (or vice versa) based on POS → **PENDING_REVIEW** with reason *"Tax type mismatch — IMS: {imsType} / Tally: {tallyType}"*.
5. **Date gap check.** If `|imsDate − tallyDate| > 7 days` → **PENDING_REVIEW** with reason *"Date gap: N days — IMS: {imsDate} / Tally: {tallyDate}"*. (Scenario: DATE_GAP.)
6. **Clean pass** → **AUTO_ACCEPTED** (no reason needed). Covers EXACT_MATCH and FORMAT_VARIATION; the latter is already handled because normalisation collapses `INV/26/021` and `INV-26-021` to the same key before lookup.

### Step 5 — Outcomes at a glance

- **AUTO_ACCEPTED** → match found, all validation checks pass.
- **AUTO_REJECTED** → GSTIN mismatch, value >10% delta, or duplicate IMS entry.
- **PENDING_REVIEW** → value delta 2–10%, soft invoice# match, tax type mismatch, or date gap >7 days.
- **NOT_IN_BOOKS** → no candidate found by either strategy.

### Step 6 — Human-readable reason

Every non-auto-accepted result gets a plain-English explanation the client can understand without GST expertise. Examples:

> *"Invoice value in IMS (₹1,02,000) is 2% higher than your books (₹1,00,000). This may be freight or packing charges. Review and Accept if agreed, or mark Pending if disputed."*

> *"The supplier GSTIN on this invoice (29PQRXX) does not match your records (27PQRXX). This is likely a wrong state registration. Reject and ask the supplier to re-file."*

Reason templates live in `lib/reconciliation/reasons.ts` so they can be edited without touching the matching logic.

### Step 7 — ITC at risk

For each non-auto-accepted invoice: `itc_at_risk = IGST + CGST + SGST`. Dashboard totals are sums across the current session.

### Re-upload handling

- **IMS re-upload:** preserve "Done" status for already-actioned invoices; re-run match for others.
- **Tally re-upload:** replace all Tally entries (since Tally is always a full dump); re-run matching for all IMS invoices.

---

## 11. UI Screens (Figma Scope)

These are the screens you design in Figma before handing off to Claude Code. Start simple — black-and-white wireframes are fine for the first pass; styling comes later.

### Must-have for MVP

1. **Landing / login page** — sign up or log in
2. **CA dashboard** (multi-client table) — the CA's home screen
3. **Client list / add client** — CA adds and manages clients
4. **Client dashboard** (IMS action queue) — the client's home screen
5. **Upload page** — two upload boxes (IMS JSON + Tally file), period + GSTIN selectors
6. **Action detail modal** — clicking an invoice in the queue opens a panel with full details and a "Mark Done" button
7. **Tally column mapping screen** — shown only when auto-detection fails
8. **Notifications panel** — dropdown from the bell icon
9. **Team management** (CA admin only) — invite staff, list team, remove member
10. **Settings / firm profile** — upload logo, edit firm name

### Nice-to-have (skip if rushed)

- History page (previous months' reconciliations)
- Export-to-Excel button on the auto-matched tab
- In-app onboarding tour

**Design tips for your Figma file:**

- Use one design system: Tailwind's default palette + a single accent colour. Keeps things consistent.
- Mock with realistic Indian data: CA firm names, GSTINs starting with 27 / 29 / 07, vendor names like "ABC Chemicals," ₹ amounts.
- Keep the CA dashboard density high — CAs look at 50+ clients at once. Keep the client dashboard low-density — clients want a short, clear list.
- Make "ITC at risk" the biggest number on every screen. That is the hook.

---

## 12. Dummy Data Plan

For the first 6 weeks of development, you will use anonymised sample data, not real client data. This is faster and avoids any compliance concerns.

### The golden fixture set (already staged)

The repo ships with a real-shaped, anonymised test set at `data/fixtures/` that doubles as the reconciliation engine's ground-truth oracle. Every change to `lib/reconciliation/` must keep the tests in `tests/reconciliation.test.ts` green against this set.

| File | Role |
|---|---|
| `27AABCU9603R1ZX-ims-2026-02.json` | IMS GSTN JSON export for Feb 2026 — 47 invoices across 45 suppliers |
| `27AABCU9603R1ZX-tally-2026-02.csv` | Matching Tally purchase register (DD/MM/YYYY dates, standard Tally headers) |
| `27AABCU9603R1ZX-recon-expected-2026-02.csv` | Expected engine output — one row per IMS invoice with scenario label, `Recon_Output`, and `Error_Reason` |
| `FIXTURES.md` | Scenario catalogue, worked examples, aggregate sanity numbers |

The fixture set covers all nine scenarios listed in §10 and produces this expected summary:

| Metric | Expected |
|---|---|
| Total IMS invoices | 47 (46 unique + 1 duplicate) |
| AUTO_ACCEPTED | 41 |
| AUTO_REJECTED | 4 (1 wrong GSTIN + 1 value >10% + 2 duplicates) |
| PENDING_REVIEW | 3 (1 value 2–10% + 1 invoice# mismatch + 1 date gap) |
| NOT_IN_BOOKS | 1 |

### Seed script

`prisma/seed.ts` creates:
- 1 CA firm ("Demo CA Associates")
- 1 Staff member
- 3 clients ("Alpha Manufacturing", "Beta Retail", "Gamma Services")
- 4 GSTINs across the clients
- An upload session for Feb 2026 pre-populated from `data/fixtures/27AABCU9603R1ZX-ims-2026-02.json` and `27AABCU9603R1ZX-tally-2026-02.csv`

`npm run seed` should produce a fully working demo with real reconciliation results in under 10 seconds. Claude Code will write this seed script.

### When more variation is needed

A second fixture with different Tally header names (e.g., `Vendor GSTIN` instead of `Supplier GSTIN`) can be added later as `data/fixtures/tally-variant-headers.csv` to exercise the column-mapping UI. The `FIXTURES.md` doc has instructions for adding new scenarios without breaking the golden set.

---

## 13. Success Metrics

How we know MVP is working:

**Product metrics (Phase 1):**
- Time from upload to action queue ready: < 30 seconds for 500 invoices
- Auto-accept rate on clean data: ≥ 80%
- False positive rate (something flagged wrong): < 2%
- Reconciliation completion time per client: < 15 minutes (from 3–4 hours today)

**Business metrics (Phase 1 exit):**
- 3–5 CA firms actively using the tool
- ≥ 3 clients per CA firm processed through one full month
- At least one CA says, "I can't go back to Excel"
- At least one client says, "I now know exactly what to do on GSTN"

---

## 14. What We Are NOT Building (MVP)

Saying no is how you ship. Explicit non-goals for Phase 1:

- ❌ Direct GSTN API integration (requires GSP partnership, ₹3–5L investment)
- ❌ AI / LLM fuzzy matching (rule-based is enough for the first users)
- ❌ 3-way matching with PO and GRN (adds ERP integration complexity)
- ❌ Vendor follow-up emails / WhatsApp (Phase 2)
- ❌ GSTR-2B vs IMS reconciliation — the post-14th flow (Phase 2)
- ❌ GSTR-3B auto-generation (Phase 3)
- ❌ Email / WhatsApp notifications (Phase 2 — in-platform only for now)
- ❌ White-label custom domains (Phase 3 — firm logo only for now)
- ❌ Native mobile app (Phase 3 — web-responsive is enough)
- ❌ Tally direct integration (Phase 3 — manual file upload for now)

Every "no" here should be framed on your website as "coming in Phase 2 / Phase 3" so users know it's on the roadmap.

---

*End of spec. See `WORKFLOW.md` for how to build this using Claude Code + Figma + GitHub.*
