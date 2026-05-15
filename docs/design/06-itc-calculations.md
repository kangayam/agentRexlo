# ITC Calculations
**Type:** Low-Level Design (LLD)  
**Audience:** Developers + CA firm partners  
**Last updated:** 2026-05-15  
**Source files:** `app/client/dashboard/page.tsx`, `app/api/clients/[clientId]/analytics/route.ts`

---

## What ITC Is (Plain English)

ITC — Input Tax Credit — is the GST a business paid on its purchases that it can offset against the GST it collected on its sales. Effectively, businesses only pay tax on the "value they add," not on the full sale price.

**Example:** A manufacturer buys raw materials for ₹1,00,000 + 18% GST = ₹18,000 tax paid. They sell finished goods for ₹1,50,000 + 18% GST = ₹27,000 tax collected. Their net GST payable = ₹27,000 − ₹18,000 = ₹9,000. The ₹18,000 they claimed back is their ITC.

ITC can only be claimed on invoices that:
1. Appear in the government's system (GSTN/IMS)
2. Are matched against the buyer's own purchase records (Tally)
3. Pass the reconciliation checks

---

## ITC Buckets

AgentGST categorises every invoice's tax value into one of four buckets:

| Bucket | Reconciliation outcome | Meaning |
|---|---|---|
| **ITC Cleared** (Safe) | AUTO_ACCEPTED | Invoice matched perfectly. ITC can be claimed. |
| **ITC At Risk** | PENDING_REVIEW | Match found but needs action. ITC cannot be claimed until resolved. |
| **ITC Blocked** | AUTO_REJECTED | Match found but definitely wrong. ITC cannot be claimed. |
| **ITC Unverified** | NOT_IN_BOOKS | No match found in Tally. Supplier may not have filed GSTR-1. |

---

## How Each Bucket Is Calculated

### ITC Cleared (Safe)
```
itcSafe = sum of (IGST + CGST + SGST) for all AUTO_ACCEPTED invoices
```
Uses the actual tax components from the IMS invoice (`igst`, `cgst`, `sgst` columns), not `itc_at_risk`. This is the correct amount because `itc_at_risk` is set to 0 for AUTO_ACCEPTED invoices by design.

### ITC At Risk (PENDING_REVIEW)
```
itcAtRisk = sum of itc_at_risk for all PENDING_REVIEW invoices
```

### ITC Blocked (AUTO_REJECTED)
```
itcBlocked = sum of itc_at_risk for all AUTO_REJECTED invoices
```

### ITC Unverified (NOT_IN_BOOKS)
```
itcUnverified = sum of itc_at_risk for all NOT_IN_BOOKS invoices
```

**Important:** `itc_at_risk = IGST + CGST + SGST` for non-AUTO_ACCEPTED invoices (set by the reconciliation classifier). For AUTO_ACCEPTED invoices, `itc_at_risk = 0`.

---

## Worked Example (Golden Test Set)

For GSTIN `27AABCU9603R1ZX`, period February 2026 (47 invoices):

Suppose the total tax breakdown is:
- 41 AUTO_ACCEPTED invoices → sum of IGST+CGST+SGST = **₹2,20,443** → ITC Cleared
- 3 PENDING_REVIEW → sum of itc_at_risk = **₹9,09,000** → ITC At Risk
- 4 AUTO_REJECTED → sum of itc_at_risk = **₹2,61,000** → ITC Blocked
- 1 NOT_IN_BOOKS → itc_at_risk → ITC Unverified

**Total ITC in system:** ₹2,20,443 + ₹9,09,000 + ₹2,61,000 + (NOT_IN_BOOKS amount) = total

**Total recoverable if client acts:** items marked "Recoverable" in the leakage breakdown

---

## ITC Leakage

"Leakage" refers to the total ITC that is not AUTO_ACCEPTED — the amount potentially lost if no action is taken.

```
itcLeakage = sum of itc_at_risk for all non-AUTO_ACCEPTED invoices
           = itcAtRisk + itcBlocked + itcUnverified
```

**Leakage %** = `itcLeakage / totalItcInBooks × 100`  
where `totalItcInBooks = sum of (IGST+CGST+SGST) for all invoices`

---

## ITC Aging

Older unrecovered ITC carries higher risk of permanent loss under GST Section 16(4), which bars ITC claims after certain time limits.

Aging buckets based on invoice date:

| Bucket | Days since invoice date | Risk level |
|---|---|---|
| Fresh | 0–30 days | Low risk |
| Ageing | 31–60 days | Follow up |
| Old | 61–90 days | Act now |
| Critical | 90+ days | Risk of permanent loss |

The 90+ days bucket triggers an alert: "₹X is over 90 days old — contact your CA immediately to prevent permanent ITC loss under Section 16(4)."

---

## Leakage Cause Breakdown

The analytics tab shows why ITC is at risk, categorised by cause:

| Cause | Reconciliation outcome | Recoverable? |
|---|---|---|
| Invoices pending review on GSTN | PENDING_REVIEW | Yes — accept on IMS portal |
| Supplier didn't file GSTR-1 | NOT_IN_BOOKS | Yes — call supplier to file |
| Value mismatch | AUTO_REJECTED (value >10%) | Possibly — raise credit/debit note |
| Wrong GSTIN | AUTO_REJECTED (GSTIN mismatch) | Possibly — supplier to re-file |
| Duplicate invoice | AUTO_REJECTED (duplicate) | No |

The cause is derived from `reason_code` stored on each `ReconciliationResult`.

---

## Money Precision

All ITC values are stored as `String` in the database (Decimal-safe representation) and processed using `Decimal.js` throughout. Display uses `toFixed(2)` and formatted with Indian number system (lakhs and crores) using `en-IN` locale.

**Never use JavaScript `number` arithmetic for ITC values** — floating point errors will corrupt totals.

```ts
// Correct
const total = new Decimal(igst).plus(cgst).plus(sgst)

// Wrong — floating point error risk
const total = parseFloat(igst) + parseFloat(cgst) + parseFloat(sgst)
```
