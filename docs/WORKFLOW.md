# AgentFlow Core — Development Workflow

**A clean Figma → Claude Code → GitHub → Vercel workflow for a non-technical founder**

> You don't need to write code. You need to know where things live, what to ask Claude Code, and how to approve what it builds.

---

## Table of Contents

1. [One-Time Setup (Day 1 — 2 hours)](#1-one-time-setup-day-1--2-hours)
2. [How the Four Tools Work Together](#2-how-the-four-tools-work-together)
3. [The Weekly Rhythm](#3-the-weekly-rhythm)
4. [Figma → Claude Code (the design handoff)](#4-figma--claude-code-the-design-handoff)
5. [Claude Code Daily Workflow](#5-claude-code-daily-workflow)
6. [GitHub Flow (branches, commits, pull requests)](#6-github-flow-branches-commits-pull-requests)
7. [Deploying to Vercel (automatic)](#7-deploying-to-vercel-automatic)
8. [The Phase 1 Build Plan (Week by Week)](#8-the-phase-1-build-plan-week-by-week)
9. [Golden Rules for Non-Technical Founders](#9-golden-rules-for-non-technical-founders)
10. [Troubleshooting & Help](#10-troubleshooting--help)

---

## 1. One-Time Setup (Day 1 — 2 hours)

Do this once and never again. All tools have free tiers.

### 1.1 Accounts you need

| Tool | Purpose | Cost |
|---|---|---|
| GitHub | Source code storage — you already have `kangayam/agentflow-core` | Free |
| Figma | UI design | Free |
| Vercel | Hosting the live app | Free |
| Supabase | Database + auth + file storage | Free |
| Claude Code | AI pair programmer | Paid Claude subscription |
| Visual Studio Code | Code editor | Free |

### 1.2 Install on your Mac

Open Terminal (Cmd + Space → "Terminal") and paste these one by one:

```bash
# 1. Install Homebrew (package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Node.js (runs JavaScript on your machine)
brew install node

# 3. Install Git (if not already there)
brew install git

# 4. Install the GitHub CLI (makes GitHub work easier)
brew install gh

# 5. Verify it all worked
node --version   # should show v20 or higher
npm --version    # should show 10 or higher
git --version    # should show 2.x
gh --version     # should show 2.x
```

### 1.3 Connect your machine to GitHub

```bash
gh auth login
# Follow the prompts. Choose: GitHub.com → HTTPS → Yes → Login with a web browser
```

### 1.4 Clone your repo

```bash
# Go to your Documents folder
cd ~/Documents/Github

# Clone the empty repo
git clone https://github.com/kangayam/agentflow-core.git

# Enter it
cd agentflow-core
```

You now have the local repo at `/Users/bhaskar/Documents/Github/agentflow-core`.

### 1.5 Install Claude Code

Follow the official install instructions at docs.claude.com, then in your terminal:

```bash
cd ~/Documents/Github/agentflow-core
claude
```

This launches Claude Code inside your project folder. From now on, any time you want Claude to help you build, you run `claude` from this folder.

### 1.6 Install Visual Studio Code

Download Visual Studio Code from https://code.visualstudio.com. Free, made by Microsoft, the industry standard. You'll use it to:

- See your project files in a sidebar
- Read the code Claude Code writes (so you can learn what's happening)
- View / accept / reject changes visually
- Open the built-in terminal (Ctrl + `) to run Claude Code right inside the editor

Recommended VS Code extensions (install from the Extensions panel, left sidebar):

- **ESLint** — flags code mistakes as you type
- **Prettier** — auto-formats your code on save
- **Prisma** — syntax highlighting for `schema.prisma`
- **Tailwind CSS IntelliSense** — autocomplete for Tailwind classes
- **GitLens** — better Git history view inside VS Code
- **GitHub Pull Requests** — open and review PRs without leaving VS Code

**How you'll use VS Code daily:**

1. Open VS Code → File → Open Folder → select `~/Documents/Github/agentflow-core`
2. Open the terminal inside VS Code: Ctrl + ` (backtick)
3. In that terminal, type `claude` to launch Claude Code
4. As Claude edits files, watch them change in the sidebar — VS Code highlights modified files in yellow/green
5. Use the Source Control panel (left sidebar, branch icon) to see all changes before committing

This setup — VS Code window open with Claude Code running in its terminal — is all you need.

---

## 2. How the Four Tools Work Together

```
            ┌──────────┐
            │  Figma   │   (1) You design screens
            └────┬─────┘
                 │  Export image / share link
                 ▼
            ┌──────────┐
            │  Claude  │   (2) You tell Claude "build this screen"
            │  Code    │       Claude writes the code
            └────┬─────┘
                 │  git commit + git push
                 ▼
            ┌──────────┐
            │  GitHub  │   (3) Source of truth for code
            └────┬─────┘
                 │  Auto-deploy on push
                 ▼
            ┌──────────┐
            │  Vercel  │   (4) Live app at yourdomain.com
            └──────────┘
```

- **Figma** is where decisions about *what the app looks like* happen.
- **Claude Code** is where decisions about *how to build it* happen.
- **GitHub** is the permanent home of your code. Every change is versioned.
- **Vercel** takes whatever is on GitHub's `main` branch and puts it on the internet.

You never directly edit code. You talk to Claude Code in English.

---

## 3. The Weekly Rhythm

A good rhythm for a non-technical founder shipping an MVP:

**Monday** — Open Figma. Design or refine the 1–2 screens you'll build this week. Take screenshots.

**Tuesday–Thursday** — Work with Claude Code. Feed it the Figma screenshots and the relevant section of `SPEC.md`. Let it build. Review what you see in the browser. Ask for changes.

**Friday** — Test end-to-end. Push the latest to `main`. Check it's live on Vercel. Write a short Loom / note to advisors and early users.

Aim for **one meaningful feature shipped per week**. Over 8 weeks, that's the Phase 1 MVP.

---

## 4. Figma → Claude Code (the design handoff)

There are four ways to bring a Figma design into Claude Code, ranked from simplest to most powerful. Start with method 1.

### Method 1 — Screenshot + description (simplest, works today)

1. In Figma, select the frame you want to build.
2. Cmd + Shift + 4 (Mac) → drag a box around it → screenshot lands on your desktop.
3. In Claude Code, drag the screenshot into the chat and type:

> *"Build this screen as the CA multi-client dashboard page at `/app/ca/dashboard/page.tsx`. Follow `SPEC.md` Section 5 Feature Group E. Use dummy data from `data/sample-seed.ts`. Use shadcn/ui table component."*

Claude Code writes the code. You run `npm run dev`, visit `http://localhost:3000/ca/dashboard`, and see your screen live.

### Method 2 — Figma export as code (good)

In Figma, select a frame → right-click → "Copy as SVG" or use the free "Figma to Code" plugin that outputs HTML/CSS. Paste the output into Claude Code:

> *"Here's the exported code from Figma. Adapt it to Next.js + Tailwind + shadcn/ui and place it in `/components/dashboard/ClientList.tsx`."*

### Method 3 — Figma Dev Mode (paid Figma plan)

Figma's Dev Mode lets engineers inspect components and copy styles. If you go paid, you can share a Dev Mode link with Claude Code:

> *"Here's the Dev Mode link for this component: [link]. Inspect it and build a matching React component."*

Claude Code can't actually open private Figma links, so this still ends with you pasting screenshots or CSS values — but the Dev Mode makes it easier to find the right values.

### Method 4 — Figma MCP server (advanced, Phase 2)

Anthropic and the Figma team support MCP (Model Context Protocol) servers that let Claude Code read Figma files directly. This is worth setting up later, but it's complex and not needed for MVP. Stick with Method 1 for the first 8 weeks.

### Golden rule for design handoff

**The cleaner your Figma, the less back-and-forth with Claude Code.** Small things that help a lot:

- Name your Figma frames meaningfully: "CA Dashboard - Default State," not "Frame 4."
- Use Figma's auto-layout on lists and tables — the spacing translates directly.
- Keep to a small palette (2–3 colours) and a small type scale (3–4 sizes).
- Use realistic copy with Indian GSTINs and ₹ amounts — it forces you to design for the real thing.

---

## 5. Claude Code Daily Workflow

### 5.1 The `CLAUDE.md` file (do this first)

Create a file at the root of your repo called `CLAUDE.md`. This is the "briefing document" Claude Code reads every time you start a session, so it always has the context.

We've already created one for you — see `CLAUDE.md` in the repo after setup. It tells Claude:
- What the product is
- What tech stack we're using
- Our modular folder structure
- Our coding conventions
- Where to find the spec

### 5.2 Start every session like this

```bash
cd ~/Documents/Github/agentflow-core
claude
```

Then your first message is usually something like:

> *"Read `CLAUDE.md` and `docs/SPEC.md` section 5. Today we're building Feature B (Data Upload). Start with the IMS JSON upload endpoint."*

Claude will read the files, then propose a plan, then ask for approval, then start editing.

### 5.3 How to phrase requests

**Bad:** "Build the dashboard."

**Good:** "Build the CA multi-client dashboard page as described in `SPEC.md` section 5, Feature Group E. Use shadcn/ui's Table component. Pull data from a Prisma query that joins clients → client_gstins → upload_sessions → reconciliation_results. Use the dummy seed data. Do not build the Notify button yet — we'll do that in the next step."

**The pattern:** *What to build → from which spec section → with which libraries → using which data → what to skip.*

### 5.4 Review and ask questions

After Claude writes code:

1. Open the browser: `http://localhost:3000/ca/dashboard`.
2. Does it look right? If not, describe what's off: *"The ITC at risk column is showing raw numbers like 820000 — format it as ₹8.2L."*
3. Does it work? Click buttons, check for errors.
4. If stuck: paste the error message to Claude and ask: *"Why is this happening and how do we fix it?"*

### 5.5 Slash commands that save time

- `/clear` — wipes the conversation, start fresh (use when switching to a different feature)
- `/init` — Claude scans your codebase and generates/updates `CLAUDE.md`
- `/review` — ask Claude to review a PR or recent changes for bugs
- `/help` — see all commands

### 5.6 Keep sessions focused

One feature per Claude Code session. Don't ask for "build upload AND reconciliation AND dashboard" in the same chat — the conversation gets confused. Finish one, `/clear`, start the next.

---

## 6. GitHub Flow (branches, commits, pull requests)

### 6.1 The rules

- **`main` is always deployable.** Anything on `main` goes live on Vercel automatically.
- Every feature gets its own **branch**: a safe sandbox where you experiment without breaking `main`.
- When the feature is good, you **merge** the branch into `main` via a **Pull Request (PR)**.

### 6.2 The commands (Claude Code will run these for you)

You almost never type these yourself — you ask Claude Code to do it. But it helps to understand what's happening.

```bash
# Start a new feature
git checkout -b feature/client-dashboard

# After Claude writes the code, review, then:
git add .
git commit -m "feat: client dashboard action queue"

# Push to GitHub
git push -u origin feature/client-dashboard

# Open a pull request (gh CLI does this cleanly)
gh pr create --title "Client dashboard" --body "Implements Feature D"

# After review, merge
gh pr merge --squash
```

### 6.3 What to ask Claude Code

At the end of a feature session, say:

> *"We're done. Commit these changes with a clear message, push to a branch called `feature/upload-ims`, and open a pull request."*

Claude Code will handle it.

### 6.4 Commit message style

Use short, present-tense imperative messages:

- `feat: add IMS JSON upload endpoint`
- `fix: handle missing Tally columns gracefully`
- `docs: update SPEC with reconciliation rules`
- `refactor: move recon engine to lib/reconciliation`

This isn't just a convention — it makes browsing history 5 years from now so much easier.

---

## 7. Deploying to Vercel (automatic)

One-time setup (15 minutes):

1. Go to vercel.com → Sign up with your GitHub account
2. Click "Add New Project" → select `kangayam/agentflow-core`
3. Vercel detects Next.js automatically → click "Deploy"
4. Set environment variables (when you add Supabase):
   - `DATABASE_URL` — from Supabase dashboard
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. First deploy takes 2 minutes. You'll get a URL like `agentflow-core.vercel.app`.

After setup: **every `git push` to `main` triggers a new deploy automatically**. You don't lift a finger.

Branches other than `main` get **preview deploys** — unique URLs you can share with a user or advisor to demo a work-in-progress feature without affecting production.

---

## 8. The Phase 1 Build Plan (Week by Week)

This is an 8-week build plan. Each week produces a demo-able chunk. If you fall behind, it's fine — the modular structure means you can ship anyway.

### Week 1 — Foundation

- Initialise Next.js project with TypeScript + Tailwind + shadcn/ui
- Connect Supabase for database + auth
- Create `prisma/schema.prisma` with all tables
- Write seed script with dummy data
- Deploy an empty "Hello AgentFlow" page to Vercel

**Ask Claude Code:** *"Initialise a Next.js 14 App Router project with TypeScript, Tailwind, shadcn/ui, and Prisma. Connect to Supabase. Use the schema described in SPEC.md Section 9. Write a seed script using the dummy data plan in Section 12. Deploy to Vercel."*

### Week 2 — Auth & Accounts

- CA sign-up, login, email OTP verification
- Forgot / reset password
- Add team member flow
- Row-level security: a CA from firm A cannot see firm B's data

**Ask Claude Code:** *"Implement Feature Group A from SPEC.md — sign-up, login, password reset, team invite. Use Supabase Auth. Enforce org-level data isolation in all API routes."*

### Week 3 — Client Management

- CA adds a client, sends invite email
- Client accepts invite, sets password
- CA adds multiple GSTINs to a client
- CA list view: all clients of the firm

### Week 4 — File Upload

- Two upload widgets on `/client/upload`: IMS JSON + Tally Excel/CSV
- Period + GSTIN selectors
- Parse IMS JSON into `ims_invoices` table
- Parse Tally file into `tally_entries` table
- Column auto-detection + fallback to manual column-mapping UI

### Week 5 — Reconciliation Engine

- Implement `lib/reconciliation/` module
- Normalise, match, rule-apply, generate reasons
- Run automatically on upload
- Write unit tests for the engine with dummy data

**This is the most important week. Do not rush it.** Ask Claude Code to write tests first:

> *"Before building the reconciliation engine, write unit tests in `tests/reconciliation.test.ts` that cover: exact match, 2% tolerance match, 5% value mismatch (pending), 12% value mismatch (reject), wrong GSTIN (reject), duplicate invoice (reject), soft invoice# match (pending), not in Tally (not in books). Use the dummy data from Section 12. Only after tests are written, implement the engine."*

### Week 6 — Client Dashboard

- `/client/dashboard` page
- Summary panel: ₹ Safe, ₹ At Risk, ₹ Blocked, ₹ Unverified
- Four tabs: Action Required / Flagged / Not in Books / Auto-Matched
- Row-level detail modal
- "Mark Done on GSTN" button + note field

### Week 7 — CA Dashboard & Notifications

- `/ca/dashboard` page: multi-client table with status column
- Sort by ITC at risk, filter by status
- "View" and "Notify" buttons per client
- In-platform notifications: bell icon + dropdown

### Week 8 — Polish & User Test

- End-to-end bug bash: upload real-ish data, walk through every screen
- Add firm logo upload in CA settings
- Load 3–5 real CA firms' sample data, demo to them
- Fix the top 5 things they complain about

**End of Week 8:** you have a working MVP. Move to Phase 2 or do a narrow pilot with 3 paying CAs.

---

## 9. Golden Rules for Non-Technical Founders

**1. Read `CLAUDE.md` and `SPEC.md` yourself first.**
You don't need to understand every line. You need to know what's there so you can point Claude at the right section.

**2. Always reference the spec.**
Every feature request should include "as described in SPEC.md section X." This keeps Claude grounded in our product, not guessing.

**3. Ship ugly before pretty.**
Week 5 reconciliation logic that works is worth more than a beautiful Week 2 landing page that does nothing. Function first, form second.

**4. One feature per session.**
Don't ask Claude Code for three things at once. Finish one, commit it, `/clear`, start the next.

**5. Use dummy data until Week 8.**
Real CA data has compliance implications. Sample data lets you move fast and lets advisors / future customers poke without legal concerns.

**6. Keep `main` green.**
If something is broken, don't merge to `main`. Work on the branch until it's clean.

**7. Commit often.**
Every time Claude Code finishes something that works, commit it. Small commits are easy to undo if something breaks.

**8. When stuck, describe the problem in full.**
Don't say "it's broken." Say: *"On `/ca/dashboard`, when I click Notify, the page shows 'Error 500'. Here's the browser console output: [paste]. Here's the Vercel log: [paste]."* Claude Code needs data to debug.

**9. Buy Claude Code's opinion lightly.**
If Claude suggests a major architecture change, pause and ask: *"Does this conflict with the modular structure in SPEC.md section 7?"* Keep the architecture stable even as features evolve.

**10. Demo weekly.**
Every Friday, show the week's work to one person — advisor, co-founder, potential CA customer. Their feedback > your ideas.

---

## 10. Troubleshooting & Help

**"My code doesn't match my Figma."**
→ Show Claude Code the screenshot again, point to the specific difference: *"The button should be blue, not grey. The font on the header should be larger."*

**"Something breaks on Vercel but works locally."**
→ 90% of the time it's a missing environment variable. Check Vercel project settings → Environment Variables. Claude Code will walk you through it.

**"The database is in a weird state."**
→ Drop it and re-seed. `npm run db:reset && npm run seed`. This is why we use dummy data — it's disposable.

**"I'm lost — what do I do next?"**
→ Open `SPEC.md` Section 4 (Roadmap) and find where you are. Open this file's Section 8 (weekly plan). Pick the next unfinished item. Ask Claude Code: *"Let's build the next thing from Week X."*

**"Claude Code gave me something I don't understand."**
→ Ask: *"Explain what you just did in plain English, step by step, as if I've never written code."* This is a feature, not a failure — Claude will always explain.

**"I need a second opinion on an architectural decision."**
→ Ask Claude Code: *"Before we implement, argue for and against this approach. List the trade-offs."* You get a balanced view, not just implementation.

---

*End of workflow. See `SPEC.md` for the product specification.*
