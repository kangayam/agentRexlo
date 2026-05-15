# Multi-GSTIN Support on Add Client Form
**Date:** 2026-05-15  
**Status:** Approved  
**Scope:** Add Client form only — no changes to reconciliation, dashboards, or upload flow

---

## Problem

The Add Client form (`/ca/clients/new`) currently accepts only one GSTIN (the primary). For clients registered in multiple states (3–10 GSTINs is common), CAs must create the client first, then navigate to the client detail page and add each additional GSTIN one at a time. This is 3+ unnecessary round-trips per client.

---

## Solution

Extend the Add Client form to accept a primary GSTIN plus zero or more additional GSTINs, all in one submission. The existing `ClientGstin` data model already supports multiple GSTINs per client — only the form and the create API endpoint need updating.

---

## UI Design

**Layout: Option B — Primary GSTIN prominent, Additional GSTINs in a collapsible optional section**

```
┌─────────────────────────────────────────────┐
│  Firm / Business Name *                      │
│  [____________________________]              │
│                                              │
│  Primary GSTIN *                             │
│  [27AABCS1234A1ZX        ] Maharashtra       │
│                                              │
│  Additional GSTINs  (optional)  2 added      │
│  ┌──────────────────────────────────────┐   │
│  │ [29AABCS1234A1ZX    ] Karnataka  ×   │   │
│  │ [33AABCS1234A1ZX    ] Tamil Nadu ×   │   │
│  │ [+ Add another state GSTIN          ]│   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Contact Email *                             │
│  [____________________________]              │
│                                              │
│  [Cancel]  [Add Client & Send Invite]        │
└─────────────────────────────────────────────┘
```

**State label:** Auto-derived from the first 2 digits of the GSTIN using a state code map. Shown inline next to each entry, updated as the user types. No extra input required.

**Behaviour:**
- Primary GSTIN field: required, validated on blur
- Additional GSTINs section: shows a counter "N added" when entries exist
- Each additional entry: validated on blur, × button removes it
- "+ Add another state GSTIN" button: appends a new empty input row (max 10 additional)
- Duplicate GSTINs within the form (primary vs additional, or two additional) show an inline error and block submission
- On submit: all GSTINs validated before API call

---

## State Code Map

New file: `lib/gstin-state.ts`

Maps the 2-digit state code prefix (characters 1–2 of a GSTIN) to the state name. Covers all 37 Indian states and UTs. Examples:

| Code | State |
|---|---|
| 01 | Jammu & Kashmir |
| 07 | Delhi |
| 27 | Maharashtra |
| 29 | Karnataka |
| 33 | Tamil Nadu |
| 36 | Telangana |
| ... | ... |

If the prefix is not recognised (user still typing), the label is hidden — no error shown until 15 characters are entered.

---

## API Change

`POST /api/clients` — `action: 'create'`

**Before:**
```json
{
  "action": "create",
  "firmName": "Sharma Traders Pvt Ltd",
  "primaryGstin": "27AABCS1234A1ZX",
  "contactEmail": "accounts@sharma.com"
}
```

**After:**
```json
{
  "action": "create",
  "firmName": "Sharma Traders Pvt Ltd",
  "primaryGstin": "27AABCS1234A1ZX",
  "additionalGstins": ["29AABCS1234A1ZX", "33AABCS1234A1ZX"],
  "contactEmail": "accounts@sharma.com"
}
```

`additionalGstins` is optional. Omitting it or sending `[]` behaves identically to the current flow.

**API-side changes:**
1. Extract `additionalGstins` from body (default `[]`)
2. Validate each with `isValidGstin()` — return 400 if any fail
3. Check uniqueness for each additional GSTIN (`clientGstin.findUnique`) — return 400 if already registered
4. Enforce max 10 additional GSTINs — return 400 if exceeded
5. Create all `ClientGstin` rows inside the same Prisma transaction as the `Client` record:
   - Primary: `is_primary: true`
   - Additional: `is_primary: false`

---

## Impact Analysis

| Area | File | Change |
|---|---|---|
| Add Client form UI | `app/ca/clients/new/page.tsx` | ✅ Rewrite |
| Create client API | `app/api/clients/route.ts` | ✅ Update — accept additionalGstins, transactional create |
| State code map | `lib/gstin-state.ts` | ✅ New file |
| Client detail Add GSTIN | `app/ca/clients/[clientId]/page.tsx` | ❌ No change — keep for adding GSTINs post-creation |
| CA Portfolio | `app/ca/clients/page.tsx` | ❌ No change |
| CA Dashboard | `app/ca/dashboard/page.tsx` | ❌ No change |
| Analytics API | `app/api/clients/[clientId]/analytics/route.ts` | ❌ No change |
| Upload flow | `app/api/upload/route.ts` | ❌ No change |
| Reconciliation engine | `lib/reconciliation/` | ❌ No change |
| Prisma schema | `prisma/schema.prisma` | ❌ No change |

**3 files changed, 1 new file. All downstream logic unaffected.**

---

## Validation Rules

| Rule | Where enforced |
|---|---|
| Each GSTIN: exactly 15 alphanumeric chars | Client-side (on blur) + API |
| Each GSTIN: globally unique | API (`clientGstin.findUnique` per GSTIN) |
| No duplicates within the same submission | Client-side before submit + API |
| Max 10 additional GSTINs | Client-side (disable + button at 10) + API |
| Primary GSTIN: always required | Client-side + API |

---

## Testing Requirements

- Add client with 1 GSTIN (primary only) — existing behaviour unchanged
- Add client with primary + 2 additional GSTINs — all 3 rows appear in client detail
- Add client with a duplicate GSTIN (already registered elsewhere) — 400 error shown inline
- Add client with an invalid GSTIN format — inline field error, form blocked
- Add client with the same GSTIN in primary and additional — caught client-side
- State label updates as user types (shows correct state at 15 chars, hidden before)
- Remove an additional GSTIN row with × — row removed, form still submits correctly
- + Add button disabled after 10 additional GSTINs

---

## What Is Not In Scope

- Setting primary GSTIN after creation (only the first-entered GSTIN is primary)
- Reordering GSTINs
- Bulk import via CSV
- Changing which GSTIN is primary post-creation
