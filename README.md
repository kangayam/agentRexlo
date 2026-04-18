# AgentFlow Core

**AI-powered ITC (Input Tax Credit) decision engine for Chartered Accountants in India.**

CAs manage 50–200 SME clients. Every month, they spend hours reconciling IMS invoices against Tally purchase registers in Excel. AgentFlow Core automates that reconciliation, surfaces only the exceptions that need human judgment, and tracks action completion — from one dashboard.

---

## Getting started (non-technical founder edition)

1. **Read the docs first:**
   - [`docs/SPEC.md`](docs/SPEC.md) — what we're building and why
   - [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — how to build it using Figma + Claude Code + GitHub
   - [`CLAUDE.md`](CLAUDE.md) — context for Claude Code at the root

2. **One-time setup** (see `WORKFLOW.md` §1):

   ```bash
   brew install node git gh
   gh auth login
   cd ~/Documents/Github/agentflow-core
   claude
   ```

3. **Start building (Week 1):** Open Claude Code in this folder and say:

   > *"Read `CLAUDE.md` and `docs/SPEC.md`. Initialise a Next.js 14 App Router project with TypeScript, Tailwind, shadcn/ui, Prisma, and Supabase client. Use the schema from SPEC.md §9. Write a seed script using the dummy data plan in §12."*

---

## Phase 1 MVP scope

**CA-first web app that lets a CA firm:**

- Onboard multi-state clients (with multiple GSTINs each)
- Receive file uploads (IMS JSON + Tally Excel) from clients
- Auto-reconcile the two data sources
- Present a plain-English action queue to the client
- Track which actions have been completed on the GSTN portal
- See an ITC-at-risk summary across every client they manage

**Not in MVP:** GSTN API integration, vendor follow-ups, GSTR-3B filing, mobile app. These are Phase 2 and 3.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Supabase) + Prisma |
| Auth | Supabase Auth |
| File storage | Supabase Storage |
| Hosting | Vercel |
| Parsing | papaparse, xlsx |
| Money | Decimal.js |

Everything has a free tier for MVP.

---

## Scripts (once the project is initialised)

```bash
npm run dev           # Local dev server at http://localhost:3000
npm run build         # Production build
npm run start         # Production server
npm run db:push       # Push Prisma schema to Supabase
npm run db:reset      # Reset DB (destroys data)
npm run seed          # Load dummy data
npm run test          # Run unit tests
```

---

## Roadmap

- **Phase 1 (Weeks 1–8):** IMS Reconciliation MVP (this repo's focus)
- **Phase 2 (Weeks 9–16):** Vendor follow-ups, GSTR-2B recon, AI fuzzy matching
- **Phase 3 (Weeks 17–24):** GSTN API integration, GSTR-3B auto-generation, Tally connector

Full detail in [`docs/SPEC.md`](docs/SPEC.md) §4.

---

## License

Proprietary — © 2026 Kangayam. All rights reserved.
