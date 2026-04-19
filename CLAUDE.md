# AgentFlow Core — Context for Claude Code

This file is read by Claude Code at the start of every session. Keep it up to date.

## What we're building

**AgentFlow Core** — An AI-powered ITC (Input Tax Credit) decision engine for Chartered Accountants in India. CAs manage 50–200 SME clients. Every month, clients upload IMS (GSTN) JSON + Tally purchase register. We auto-reconcile and surface an action queue.

Phase 1 MVP is **CA-first**: CA portal + Client portal, one platform, web only.

Full spec: `docs/SPEC.md`. Development workflow: `docs/WORKFLOW.md`.

## Tech stack

- **Frontend + API:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui components
- **Database:** PostgreSQL via Supabase + Prisma ORM
- **Auth:** Supabase Auth (email + password)
- **File storage:** Supabase Storage
- **Hosting:** Vercel (auto-deploy from `main`)
- **Parsing:** `papaparse` (CSV), `xlsx` (Excel)
- **Money math:** `Decimal.js`

## Folder structure (strict — keep it this way)

```
app/              Next.js pages + API routes
  (auth)/         Login, signup, reset
  ca/             CA portal (dashboard, clients, team)
  client/         Client portal (dashboard, upload, history)
  api/            API route handlers

lib/              Framework-agnostic business logic (the brain)
  auth/           Session + permission helpers
  parsers/        IMS JSON parser, Tally Excel parser
  reconciliation/ Recon engine: normalize, matcher, rules, reasons
  notifications/  In-platform for MVP; email/whatsapp slot in later
  storage/        File upload/download abstraction
  db/             Prisma client + helpers

prisma/           schema.prisma + seed.ts

components/       React components
  ui/             shadcn/ui primitives
  dashboard/      Dashboard widgets
  upload/         Upload widgets
  tables/         Data tables

tests/            Unit tests (focus on lib/reconciliation)

docs/             SPEC.md, WORKFLOW.md, this file

data/
  fixtures/       Golden test set for reconciliation engine (see data/fixtures/FIXTURES.md)
```

## Coding conventions

- TypeScript strict mode ON. No `any` unless truly necessary.
- All API routes must filter data by the caller's org/client. Row-level security is enforced in code, not DB.
- All money values: `Decimal.js`, stored as string in DB, displayed with `₹` prefix.
- All dates: ISO 8601 in DB, `dd MMM yyyy` in UI.
- Use Prisma for every DB query. Never write raw SQL.
- Functions that do meaningful work must have a unit test.

## Naming conventions

- Files: `kebab-case.ts` / `PascalCase.tsx` for React components
- Variables & functions: `camelCase`
- Types & interfaces: `PascalCase`
- Database tables & columns: `snake_case`
- Prisma models: `PascalCase` singular (e.g., `Client`, `ImsInvoice`)

## Key domain terms (don't get these wrong)

- **GSTIN** — 15-char alphanumeric GST identification number. Always uppercase.
- **ITC** — Input Tax Credit. Money businesses get back from GST they paid on inputs.
- **IMS** — Invoice Management System, the GSTN portal where buyers Accept/Reject/Pending each supplier invoice.
- **GSTR-1** — Monthly outward supplies return filed by the 11th.
- **GSTR-2B** — Auto-generated ITC statement, published by GSTN on the 14th.
- **GSTR-3B** — Monthly summary return filed by the 20th.
- **HSN** — Harmonised product code used in GST. Different HSN → different tax rate.
- **POS** — Place of Supply. Determines whether tax is IGST (inter-state) or CGST+SGST (intra-state).
- **Reconciliation** — Matching IMS invoices vs Tally purchase register.

## Rules that matter

1. **Normalize before matching.** GSTINs uppercase, invoice numbers lowercase/stripped of `/ - _ \ # space` and leading zeros, values rounded to 2 decimals, dates parsed into ISO 8601 from both `DD-MM-YYYY` (IMS) and `DD/MM/YYYY` (Tally). See `lib/reconciliation/normalize.ts`.
2. **Match on invoice# first, validate GSTIN second.** GSTIN is NOT part of the match key — it is a validation step that fires AUTO_REJECTED when mismatched. If you make GSTIN part of the match key, the WRONG_GSTIN fixture will silently become NOT_IN_BOOKS and the engine will be wrong. Candidate lookup uses two strategies: (A) same normalised invoice#, (B) same GSTIN + value within 2% + same tax type (for soft invoice# matches). Details in SPEC.md §10.
3. **Four outcomes.** `AUTO_ACCEPTED`, `AUTO_REJECTED`, `PENDING_REVIEW`, `NOT_IN_BOOKS`.
4. **ITC at risk** = IGST + CGST + SGST for any non-auto-accepted invoice.
5. **Re-upload behaviour.** IMS re-upload is additive and preserves "Done" status. Tally re-upload replaces all.

## Reconciliation test fixtures (non-negotiable)

The golden test set lives at `data/fixtures/`:
- `27AABCU9603R1ZX-ims-2026-02.json` — input (IMS)
- `27AABCU9603R1ZX-tally-2026-02.csv` — input (Tally)
- `27AABCU9603R1ZX-recon-expected-2026-02.csv` — **expected engine output**
- `FIXTURES.md` — scenario catalogue + aggregate sanity numbers

Any change to `lib/reconciliation/` or `lib/parsers/` must keep `tests/reconciliation.test.ts` green against this expected output. The 9 scenarios covered: `EXACT_MATCH`, `WRONG_GSTIN`, `NOT_IN_BOOKS`, `VALUE_OVER_10`, `VALUE_MISMATCH_2_10`, `FORMAT_VARIATION`, `INVOICE_NUMBER_MISMATCH`, `DATE_GAP`, `DUPLICATE`. Expected totals: 41 AUTO_ACCEPTED, 4 AUTO_REJECTED, 3 PENDING_REVIEW, 1 NOT_IN_BOOKS over 47 rows.

## Phase scope — what we are NOT building yet

- Direct GSTN API integration (Phase 3)
- AI / LLM fuzzy matching (Phase 2)
- 3-way match with PO + GRN (Phase 3)
- Vendor follow-up emails / WhatsApp (Phase 2)
- GSTR-2B recon post-14th (Phase 2)
- GSTR-3B generation (Phase 3)
- Mobile app (Phase 3)

If a request would require one of these, pause and flag it instead of implementing.

## How to work with this codebase

- Before implementing any feature, confirm which SPEC.md section it maps to.
- Before writing code, propose a short plan. Let the founder approve.
- Write tests for any function in `lib/reconciliation/` before/alongside implementation.
- Keep changes small. One PR = one feature.
- Commit messages: `feat:`, `fix:`, `docs:`, `refactor:` prefixes.
- When you hit an ambiguity, ask rather than guess.
- When you finish a feature, update `docs/SPEC.md` if behaviour changed.
