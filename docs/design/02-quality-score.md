# Quality Score
**Type:** Low-Level Design (LLD)  
**Audience:** Developers + CA firm partners  
**Last updated:** 2026-05-15  
**Source file:** `lib/quality-score.ts`  
**Tests:** `tests/quality-score.test.ts`

---

## What It Is (Plain English)

The Quality Score (called "GST Health Score" in the client portal) is a single number from 0–100 that summarises how well a client's GST reconciliation is managed for a given period. A score of 100 means every invoice matched perfectly and all ITC is safe. A score of 20 means nothing matched and all ITC is at risk.

The score appears in four places:
- **Client Dashboard** — "Your GST Health Score"
- **CA Analytics tab** — "Quality Score" panel per client
- **CA Portfolio** — quality column in the client table
- **CA Dashboard** — quality pill per client and average across all clients

All four use the same function: `computeQualityScore()` in `lib/quality-score.ts`.

---

## Formula

```
qualityScore = min(100, round(
  autoAcceptPct × 50  +
  recoveryRate  × 30  +
  20
))
```

Where:
- `autoAcceptPct` = AUTO_ACCEPTED invoices ÷ total invoices (0–1 ratio)
- `recoveryRate` = sum of (IGST+CGST+SGST) for AUTO_ACCEPTED invoices ÷ sum of (IGST+CGST+SGST) for all invoices (0–1 ratio)
- The base constant `+20` is the floor — a client with zero matching invoices scores 20, not 0

### Why these weights?

| Component | Weight | Rationale |
|---|---|---|
| Auto-accept rate × 50 | 50% of score | Count-based signal: how many invoices matched cleanly. Dominant factor. |
| Recovery rate × 30 | 30% of score | Value-based signal: what fraction of the actual tax money is safe. A ₹50L matched invoice matters more than a ₹5K one. |
| Base constant +20 | 20 points | Acknowledges that filing on time has value even when no Tally data is uploaded yet. |
| `min(100, ...)` cap | — | Prevents impossible scores above 100 in edge cases. |

### Why value-based recovery (not count-based)?

An earlier version used count of "done" items ÷ total non-accepted as the recovery rate. This penalised a CA who had 50 tiny invoices pending and rewarded one who had 2 large invoices pending. Value-based recovery correctly reflects ITC exposure.

---

## Quality Bands

| Band | Score range | Displayed as |
|---|---|---|
| Excellent | 90–100 | Green |
| Good | 75–89 | Teal |
| Fair | 60–74 | Amber |
| Poor | 45–59 | Orange |
| Critical | 0–44 | Red |

---

## Worked Example (Golden Test Set)

Using the fixture data for GSTIN `27AABCU9603R1ZX`, period February 2026:

**Invoice counts:** 41 AUTO_ACCEPTED, 4 AUTO_REJECTED, 3 PENDING_REVIEW, 1 NOT_IN_BOOKS = 49 total

**Step 1 — Auto-accept rate:**
```
autoAcceptPct = 41 / 49 = 0.837
```

**Step 2 — Recovery rate (value-based):**
The 41 AUTO_ACCEPTED invoices have IGST+CGST+SGST totalling, say, ₹2,20,443. All 49 invoices total, say, ₹13,90,443.
```
recoveryRate = 2,20,443 / 13,90,443 = 0.159
```

**Step 3 — Score:**
```
qualityScore = min(100, round(0.837 × 50 + 0.159 × 30 + 20))
             = min(100, round(41.8 + 4.8 + 20))
             = min(100, round(66.6))
             = 67  → Fair
```

**Worst case (no matches at all):**
```
autoAcceptPct = 0, recoveryRate = 0
qualityScore = min(100, round(0 + 0 + 20)) = 20 → Critical
```

**Best case (all accepted):**
```
autoAcceptPct = 1, recoveryRate = 1
qualityScore = min(100, round(50 + 30 + 20)) = 100 → Excellent
```

---

## API

```ts
import { computeQualityScore } from '@/lib/quality-score'

const { qualityScore, qualityBand } = computeQualityScore(results)
// results: Array<{ outcome, igst, cgst, sgst }>
// qualityScore: number  (0–100)
// qualityBand:  'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'
```

---

## Where It Is Called

| Location | File |
|---|---|
| CA Dashboard server component | `app/ca/dashboard/page.tsx` |
| CA Portfolio server component | `app/ca/clients/page.tsx` |
| CA Dashboard API route | `app/api/dashboard/ca/route.ts` |
| CA Analytics API route | `app/api/clients/[clientId]/analytics/route.ts` |
| CA Trend API route | `app/api/clients/[clientId]/trend/route.ts` |
| Client Dashboard client component | `app/client/dashboard/page.tsx` |

---

## History

Before May 2026, six separate formulas existed across these six locations. They disagreed because:
- Three used a base constant of `0.8 × 20 = 16` instead of `+20`
- Three used count-based recovery (done items ÷ non-accepted items)
- One used `itc_at_risk` for accepted invoices (always 0), making recovery always 0
- One had no `min(100, …)` cap

The canonical `computeQualityScore()` function was extracted to eliminate the divergence. All six locations now import it.
