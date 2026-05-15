# Multi-GSTIN Add Client Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow CAs to enter a primary GSTIN plus up to 10 additional GSTINs when creating a new client, with state names auto-derived from the GSTIN prefix.

**Architecture:** Three-layer change — (1) a new pure utility `lib/gstin-state.ts` maps 2-digit state codes to names, (2) the `POST /api/clients` create action is extended to accept and persist `additionalGstins[]` in the same Prisma transaction, (3) the Add Client form UI is rewritten to show a primary GSTIN field plus an expandable additional-GSTINs section with state labels and remove buttons.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, Tailwind CSS, Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/gstin-state.ts` | **Create** | Map 2-digit state code → state name |
| `tests/gstin-state.test.ts` | **Create** | Unit tests for state lookup |
| `app/api/clients/route.ts` | **Modify** | Accept `additionalGstins[]`, validate, persist transactionally |
| `app/ca/clients/new/page.tsx` | **Modify** | Multi-GSTIN form UI with state labels |

---

## Task 1 — State Code Utility

**Files:**
- Create: `lib/gstin-state.ts`
- Create: `tests/gstin-state.test.ts`

- [ ] **Step 1.1 — Write the failing test**

Create `tests/gstin-state.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { getStateFromGstin } from '@/lib/gstin-state'

describe('getStateFromGstin', () => {
  test('returns Maharashtra for 27-prefix GSTIN', () => {
    expect(getStateFromGstin('27AABCU9603R1ZX')).toBe('Maharashtra')
  })

  test('returns Karnataka for 29-prefix GSTIN', () => {
    expect(getStateFromGstin('29AABCS1234A1ZX')).toBe('Karnataka')
  })

  test('returns Delhi for 07-prefix GSTIN', () => {
    expect(getStateFromGstin('07AABCS1234A1ZX')).toBe('Delhi')
  })

  test('returns Tamil Nadu for 33-prefix GSTIN', () => {
    expect(getStateFromGstin('33AABCS1234A1ZX')).toBe('Tamil Nadu')
  })

  test('returns Telangana for 36-prefix GSTIN', () => {
    expect(getStateFromGstin('36AABCS1234A1ZX')).toBe('Telangana')
  })

  test('returns null for unrecognised prefix', () => {
    expect(getStateFromGstin('98AABCS1234A1ZX')).toBeNull()
  })

  test('returns null for string shorter than 2 chars', () => {
    expect(getStateFromGstin('2')).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(getStateFromGstin('')).toBeNull()
  })

  test('works with partially-typed GSTIN (2 chars)', () => {
    expect(getStateFromGstin('27')).toBe('Maharashtra')
  })
})
```

- [ ] **Step 1.2 — Run test, confirm it fails**

```bash
npx vitest run tests/gstin-state.test.ts
```
Expected: `Cannot find package '@/lib/gstin-state'`

- [ ] **Step 1.3 — Implement `lib/gstin-state.ts`**

```ts
const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
}

export function getStateFromGstin(gstin: string): string | null {
  if (gstin.length < 2) return null
  return STATE_CODES[gstin.substring(0, 2)] ?? null
}
```

- [ ] **Step 1.4 — Run test, confirm all pass**

```bash
npx vitest run tests/gstin-state.test.ts
```
Expected: `9 passed`

- [ ] **Step 1.5 — Commit**

```bash
git add lib/gstin-state.ts tests/gstin-state.test.ts
git commit -m "feat: add GSTIN state code lookup utility"
```

---

## Task 2 — Extend Create Client API

**Files:**
- Modify: `app/api/clients/route.ts`

The change is in the `action === 'create'` block only. No other actions are touched.

- [ ] **Step 2.1 — Replace the create block**

In `app/api/clients/route.ts`, find the `if (action === 'create')` block and replace it entirely with:

```ts
if (action === 'create') {
  const { firmName, primaryGstin, contactEmail, additionalGstins = [] } = body as {
    firmName:         string
    primaryGstin:     string
    contactEmail:     string
    additionalGstins?: string[]
  }

  if (!firmName?.trim())
    return NextResponse.json({ error: 'Firm name is required' }, { status: 400 })

  if (!GSTIN_REGEX.test(primaryGstin?.toUpperCase() ?? ''))
    return NextResponse.json(
      { error: 'Invalid primary GSTIN — must be 15 alphanumeric characters' },
      { status: 400 }
    )

  if (!Array.isArray(additionalGstins) || additionalGstins.length > 10)
    return NextResponse.json(
      { error: 'Maximum 10 additional GSTINs allowed' },
      { status: 400 }
    )

  // Validate each additional GSTIN format
  for (const g of additionalGstins) {
    if (!GSTIN_REGEX.test(g?.toUpperCase() ?? ''))
      return NextResponse.json(
        { error: `Invalid additional GSTIN "${g}" — must be 15 alphanumeric characters` },
        { status: 400 }
      )
  }

  const normalizedPrimary    = primaryGstin.toUpperCase()
  const normalizedAdditional = additionalGstins.map(g => g.toUpperCase())
  const allGstins            = [normalizedPrimary, ...normalizedAdditional]

  // Reject duplicates within submission
  const unique = new Set(allGstins)
  if (unique.size !== allGstins.length)
    return NextResponse.json(
      { error: 'Duplicate GSTINs in submission — each GSTIN must be unique' },
      { status: 400 }
    )

  // Check all GSTINs against existing records
  for (const gstin of allGstins) {
    const existing = await prisma.clientGstin.findUnique({ where: { gstin } })
    if (existing)
      return NextResponse.json(
        { error: `GSTIN ${gstin} is already registered` },
        { status: 400 }
      )
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: dbUser.org_id },
    select: { name: true },
  })

  const inviteToken     = crypto.randomUUID()
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const client = await prisma.client.create({
    data: {
      org_id:            dbUser.org_id,
      name:              firmName.trim(),
      contact_email:     contactEmail.trim(),
      invite_token:      inviteToken,
      invite_expires_at: inviteExpiresAt,
      gstins: {
        create: [
          { gstin: normalizedPrimary, is_primary: true },
          ...normalizedAdditional.map(g => ({ gstin: g, is_primary: false })),
        ],
      },
    },
    include: { gstins: true },
  })

  try {
    await sendClientInviteEmail({ to: contactEmail.trim(), caOrgName: org.name, token: inviteToken })
  } catch (err) {
    await prisma.client.delete({ where: { id: client.id } })
    const message = err instanceof Error ? err.message : 'Failed to send invite email'
    return NextResponse.json({ error: `Email not sent: ${message}` }, { status: 500 })
  }

  return NextResponse.json({ client })
}
```

- [ ] **Step 2.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output (clean)

- [ ] **Step 2.3 — Manual smoke test (no DB needed)**

Verify these API behaviours mentally against the code:
- `additionalGstins` omitted → defaults to `[]` → only primary created ✓
- `additionalGstins: []` → same as omitted ✓
- `additionalGstins` with 11 entries → 400 ✓
- Duplicate GSTIN in primary + additional → 400 ✓
- Invalid format in additional → 400 per-GSTIN with name ✓

- [ ] **Step 2.4 — Commit**

```bash
git add app/api/clients/route.ts
git commit -m "feat: accept additionalGstins[] on create client API"
```

---

## Task 3 — Multi-GSTIN Add Client Form UI

**Files:**
- Modify: `app/ca/clients/new/page.tsx`

Replace the entire file content with the implementation below. The form keeps all existing fields (firm name, primary GSTIN, email) and adds the Additional GSTINs section between primary GSTIN and email.

- [ ] **Step 3.1 — Replace `app/ca/clients/new/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus, X } from 'lucide-react'
import { getStateFromGstin } from '@/lib/gstin-state'

const GSTIN_REGEX = /^[A-Z0-9]{15}$/
const MAX_ADDITIONAL = 10

function normalizeGstin(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15)
}

function GstinInput({
  value,
  onChange,
  onRemove,
  error,
  placeholder,
  isPrimary,
}: {
  value:       string
  onChange:    (v: string) => void
  onRemove?:   () => void
  error?:      string
  placeholder: string
  isPrimary:   boolean
}) {
  const state   = getStateFromGstin(value)
  const isValid = GSTIN_REGEX.test(value)

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={e => onChange(normalizeGstin(e.target.value))}
            placeholder={placeholder}
            maxLength={15}
            className={`w-full h-10 px-3 pr-24 text-sm font-mono border rounded-lg bg-white
                       text-slate-900 placeholder:text-slate-400 placeholder:font-sans
                       focus:outline-none focus:ring-2 transition-colors
                       ${error
                         ? 'border-red-400 focus:ring-red-100'
                         : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-400'}`}
          />
          {/* State label — shown when 2+ chars entered and state is known */}
          {state && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]
                             font-medium text-slate-400 pointer-events-none whitespace-nowrap">
              {state}
            </span>
          )}
        </div>

        {isPrimary ? (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50
                           text-blue-600 border border-blue-200 whitespace-nowrap">
            Primary
          </span>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove GSTIN"
            className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center
                       justify-center text-slate-400 hover:text-red-500 hover:border-red-200
                       hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* char counter for primary; error for all */}
      {isPrimary && !error && (
        <p className="text-[11px] text-slate-400 mt-1">
          {value.length}/15 characters
          {isValid && <span className="ml-2 text-green-600 font-medium">✓</span>}
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default function NewClientPage() {
  const router = useRouter()

  const [firmName,          setFirmName]          = useState('')
  const [primaryGstin,      setPrimaryGstin]      = useState('')
  const [additionalGstins,  setAdditionalGstins]  = useState<string[]>([])
  const [email,             setEmail]             = useState('')
  const [submitting,        setSubmitting]        = useState(false)
  const [apiError,          setApiError]          = useState('')
  const [fieldErrors,       setFieldErrors]       = useState<Record<string, string>>({})
  const [additionalErrors,  setAdditionalErrors]  = useState<string[]>([])

  function clearFieldError(key: string) {
    setFieldErrors(p => ({ ...p, [key]: '' }))
  }

  function handleAddGstin() {
    if (additionalGstins.length >= MAX_ADDITIONAL) return
    setAdditionalGstins(p => [...p, ''])
    setAdditionalErrors(p => [...p, ''])
  }

  function handleAdditionalChange(index: number, value: string) {
    setAdditionalGstins(p => p.map((g, i) => i === index ? normalizeGstin(value) : g))
    setAdditionalErrors(p => p.map((e, i) => i === index ? '' : e))
  }

  function handleRemoveGstin(index: number) {
    setAdditionalGstins(p => p.filter((_, i) => i !== index))
    setAdditionalErrors(p => p.filter((_, i) => i !== index))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    let valid = true

    if (!firmName.trim()) { errs.firmName = 'Firm name is required'; valid = false }

    if (!GSTIN_REGEX.test(primaryGstin)) {
      errs.primaryGstin = 'Must be exactly 15 alphanumeric characters'
      valid = false
    }

    if (!email.trim()) { errs.email = 'Contact email is required'; valid = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Invalid email address'
      valid = false
    }

    setFieldErrors(errs)

    // Validate additional GSTINs
    const addErrs = additionalGstins.map((g, i) => {
      if (!GSTIN_REGEX.test(g)) return 'Must be exactly 15 alphanumeric characters'
      // Duplicate check against primary
      if (g === primaryGstin) return 'Duplicate of primary GSTIN'
      // Duplicate check within additional list
      if (additionalGstins.indexOf(g) !== i) return 'Duplicate GSTIN'
      return ''
    })
    setAdditionalErrors(addErrs)
    if (addErrs.some(e => e !== '')) valid = false

    return valid
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:           'create',
          firmName:         firmName.trim(),
          primaryGstin,
          additionalGstins: additionalGstins.filter(g => g.length > 0),
          contactEmail:     email.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setApiError(data.error ?? 'Something went wrong.'); return }
      router.push(`/ca/clients/${data.client.id}`)
    } catch {
      setApiError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-8 py-6 max-w-xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-400 mb-6">
        <button onClick={() => router.push('/ca/clients')}
                className="hover:text-slate-600 transition-colors">
          Client Portfolio
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 font-medium">Add Client</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Add New Client</h1>
        <p className="text-xs text-slate-500 mt-1">
          An invite email will be sent to the client so they can set up their portal account.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Firm name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Firm / Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firmName}
              onChange={e => { setFirmName(e.target.value); clearFieldError('firmName') }}
              placeholder="e.g. Sharma Traders Pvt Ltd"
              className={`w-full h-10 px-3 text-sm border rounded-lg bg-white text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors
                         ${fieldErrors.firmName
                           ? 'border-red-400 focus:ring-red-100'
                           : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-400'}`}
            />
            {fieldErrors.firmName && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.firmName}</p>
            )}
          </div>

          {/* Primary GSTIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary GSTIN <span className="text-red-500">*</span>
            </label>
            <GstinInput
              value={primaryGstin}
              onChange={v => { setPrimaryGstin(v); clearFieldError('primaryGstin') }}
              error={fieldErrors.primaryGstin}
              placeholder="e.g. 27AABCU9603R1ZX"
              isPrimary
            />
          </div>

          {/* Additional GSTINs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Additional GSTINs
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">(optional)</span>
              </label>
              {additionalGstins.length > 0 && (
                <span className="text-[10px] font-medium text-slate-400">
                  {additionalGstins.length} added
                </span>
              )}
            </div>

            {additionalGstins.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-2">
                <div className="divide-y divide-slate-100">
                  {additionalGstins.map((g, i) => (
                    <div key={i} className="px-3 py-2.5">
                      <GstinInput
                        value={g}
                        onChange={v => handleAdditionalChange(i, v)}
                        onRemove={() => handleRemoveGstin(i)}
                        error={additionalErrors[i]}
                        placeholder={`e.g. 29AABCU9603R1ZX`}
                        isPrimary={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {additionalGstins.length < MAX_ADDITIONAL && (
              <button
                type="button"
                onClick={handleAddGstin}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500
                           hover:text-slate-700 border border-dashed border-slate-300
                           hover:border-slate-400 rounded-lg px-3 h-8 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add another state GSTIN
              </button>
            )}

            {additionalGstins.length === MAX_ADDITIONAL && (
              <p className="text-[11px] text-slate-400">
                Maximum of {MAX_ADDITIONAL} additional GSTINs reached.
              </p>
            )}
          </div>

          {/* Contact email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clearFieldError('email') }}
              placeholder="e.g. accounts@sharmatraders.com"
              className={`w-full h-10 px-3 text-sm border rounded-lg bg-white text-slate-900
                         placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors
                         ${fieldErrors.email
                           ? 'border-red-400 focus:ring-red-100'
                           : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-400'}`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              An invite link will be sent to this address.
            </p>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/ca/clients')}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white
                         text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-semibold
                         hover:bg-slate-800 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding Client…' : 'Add Client & Send Invite'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3
                      flex gap-3 text-xs text-blue-700 leading-relaxed">
        <span className="flex-shrink-0 mt-0.5">ℹ</span>
        <span>
          The client will receive an invite email to set up their portal account.
          The invite expires in <strong>7 days</strong>. You can resend it from the
          client detail page. Additional GSTINs can also be added later from the
          client detail page.
        </span>
      </div>

    </div>
  )
}
```

- [ ] **Step 3.2 — Type-check**

```bash
npx tsc --noEmit
```
Expected: no output (clean)

- [ ] **Step 3.3 — Run all tests**

```bash
npx vitest run
```
Expected: all existing tests pass + 9 new gstin-state tests pass

- [ ] **Step 3.4 — Manual test checklist**

Start dev server: `npm run dev`  
Navigate to `/ca/clients/new` and verify each scenario:

| Scenario | Expected |
|---|---|
| Submit with primary GSTIN only | Client created with 1 GSTIN, redirects to detail page |
| Type `27` in primary GSTIN | `Maharashtra` label appears inline |
| Type `29` in additional GSTIN row | `Karnataka` label appears |
| Click "+ Add another state GSTIN" 10 times | 10 rows shown, button disappears, replaced by max message |
| Enter same GSTIN in primary and additional | Client-side error: "Duplicate of primary GSTIN" |
| Enter 14-char GSTIN and submit | Error: "Must be exactly 15 alphanumeric characters" |
| Enter 3 additional GSTINs and submit | Client created with 4 GSTINs total; detail page shows all 4 under GSTINs section |
| Remove a GSTIN row with × | Row disappears, count updates |
| Unknown prefix (e.g. `98`) | No state label shown, but form still works |

- [ ] **Step 3.5 — Commit**

```bash
git add app/ca/clients/new/page.tsx
git commit -m "feat: multi-GSTIN support on Add Client form"
```

---

## Task 4 — Update Design Doc and Final Push

**Files:**
- Modify: `docs/design/04-upload-processing.md` (minor — note GSTINs can be added at creation)
- Modify: `docs/design/00-system-overview.md` (no change needed — multi-GSTIN was already supported)

- [ ] **Step 4.1 — Update upload-processing design doc**

In `docs/design/04-upload-processing.md`, find the section on multi-GSTIN and add a note that GSTINs can now be added at client creation time as well as post-creation from the client detail page. Add after the "Filing Period Logic" section:

```markdown
## Multi-GSTIN Clients

A client can have multiple GSTINs — one per state they operate in. GSTINs can be added:
- **At creation** — primary GSTIN required, up to 10 additional GSTINs optional (Add Client form)
- **Post-creation** — via the "Client Info & Settings" panel on the client detail page

Each GSTIN has its own upload sessions, IMS invoices, and reconciliation results. Reconciliation runs independently per GSTIN. Analytics and dashboard views aggregate across all GSTINs for a client.
```

- [ ] **Step 4.2 — Commit and push everything**

```bash
git add docs/design/04-upload-processing.md
git commit -m "docs: update upload-processing doc for multi-GSTIN creation"
git push origin master
```
