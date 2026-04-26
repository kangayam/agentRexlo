/**
 * Single source of truth for reconciliation reason text.
 *
 * SPEC.md §10 Step 6: "Reason templates live in lib/reconciliation/reasons.ts
 * so they can be edited without touching the matching logic."
 *
 * Canonical wording is locked to the expected reason strings in
 * data/fixtures/27AABCU9603R1ZX-recon-expected-2026-02.csv.
 */

export const REASON_CODES = {
  GSTIN_MISMATCH:      'GSTIN_MISMATCH',
  VALUE_OVER_10:       'VALUE_OVER_10',
  VALUE_2_TO_10:       'VALUE_2_TO_10',
  SOFT_INVOICE_MATCH:  'SOFT_INVOICE_MATCH',
  TAX_TYPE_MISMATCH:   'TAX_TYPE_MISMATCH',
  DATE_GAP:            'DATE_GAP',
  FORMAT_VARIATION:    'FORMAT_VARIATION',
  DUPLICATE:           'DUPLICATE',
  NOT_IN_BOOKS:        'NOT_IN_BOOKS',
} as const

export type ReasonCode = typeof REASON_CODES[keyof typeof REASON_CODES]

const TEMPLATES: Record<ReasonCode, string> = {
  GSTIN_MISMATCH:
    'Supplier GSTIN mismatch — IMS: {imsGstin} / Tally: {tallyGstin}',
  VALUE_OVER_10:
    'Value delta: Tally ₹{tallyValue} vs IMS ₹{imsValue} ({sign}{pct}% — exceeds 10% threshold)',
  VALUE_2_TO_10:
    'Value delta: Tally ₹{tallyValue} vs IMS ₹{imsValue} ({sign}{pct}% — within 2–10% band)',
  SOFT_INVOICE_MATCH:
    'Invoice# mismatch — IMS: "{imsInv}" / Tally: "{tallyInv}" (normalised keys differ)',
  TAX_TYPE_MISMATCH:
    'Tax type mismatch — IMS: {imsType} / Tally: {tallyType}',
  DATE_GAP:
    'Date gap: {days} days — IMS: {imsDate} / Tally: {tallyDate}',
  FORMAT_VARIATION:
    'Format-only diff — normalises to same key (IMS: "{imsInv}" / Tally: "{tallyInv}")',
  DUPLICATE:
    'Duplicate IMS entry — same invoice uploaded twice by supplier (2 IMS entries for 1 Tally row)',
  NOT_IN_BOOKS:
    'Invoice not found in Tally books — no matching purchase entry',
}

export function buildReason(
  code: ReasonCode,
  params: Record<string, string | number> = {}
): string {
  let text = TEMPLATES[code]
  for (const [key, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
  }
  return text
}
