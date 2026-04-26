/**
 * Audit harness — runs the recon engine against the golden fixture and
 * compares row-by-row to the expected CSV (outcome AND reason). Bypasses
 * vitest so it can run in environments where the native binding for vitest's
 * bundler is missing.
 *
 * Usage from repo root:
 *   ./node_modules/.bin/tsc -p scripts/audit-tsconfig.json
 *   # then the rewrite step (see audit-tsconfig.json comment), then:
 *   node audit-dist/scripts/audit-recon.js
 *
 * Or simply run `npm test` once vitest is healthy on the host.
 */
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseImsJson } from '../lib/parsers/ims-json-parser'
import { parseTallyCsv } from '../lib/parsers/tally-csv-parser'
import { reconcile } from '../lib/reconciliation'

const FIXTURES = path.resolve(process.cwd(), 'data', 'fixtures')

const imsRaw = fs.readFileSync(path.join(FIXTURES, '27AABCU9603R1ZX-ims-2026-02.json'), 'utf-8')
const tallyRaw = fs.readFileSync(path.join(FIXTURES, '27AABCU9603R1ZX-tally-2026-02.csv'), 'utf-8')
const expectedRaw = fs.readFileSync(path.join(FIXTURES, '27AABCU9603R1ZX-recon-expected-2026-02.csv'), 'utf-8')

const ims = parseImsJson(imsRaw)
const tally = parseTallyCsv(tallyRaw)

const { data: expected } = Papa.parse<Record<string, string>>(expectedRaw, {
  header: true,
  skipEmptyLines: true,
})

const results = reconcile(ims, tally)

console.log('--- inputs ---')
console.log('IMS rows:    ', ims.length)
console.log('Tally rows:  ', tally.length)
console.log('Expected:    ', expected.length)
console.log('Engine emit: ', results.length)

console.log('\n--- engine outcome breakdown ---')
const counts: Record<string, number> = {}
for (const r of results) counts[r.result] = (counts[r.result] ?? 0) + 1
console.log(counts)

console.log('\n--- expected outcome breakdown ---')
const eCounts: Record<string, number> = {}
for (const r of expected) eCounts[r.Recon_Output] = (eCounts[r.Recon_Output] ?? 0) + 1
console.log(eCounts)

console.log('\n--- per-row mismatches ---')
let outcomeMismatches = 0
let reasonMismatches = 0
for (const row of expected) {
  const actual = results.find(
    r => r.imsInvoiceNum === row.IMS_Invoice_ID && r.imsGstin === row.IMS_Supplier_GSTIN
  )
  if (!actual) {
    console.log(`MISSING: ${row.IMS_Supplier_GSTIN}::${row.IMS_Invoice_ID}  expected=${row.Recon_Output}`)
    outcomeMismatches++
    continue
  }
  if (actual.result !== row.Recon_Output) {
    console.log(`OUTCOME: ${row.IMS_Invoice_ID}  expected=${row.Recon_Output}  got=${actual.result}`)
    outcomeMismatches++
    continue
  }
  // Compare reason text too. AUTO_ACCEPTED rows in expected CSV have empty reason
  // but engine emits null for clean-pass and a string for FORMAT_VARIATION.
  const expectedReason = (row.Error_Reason ?? '').trim()
  const actualReason = (actual.reason ?? '').trim()
  if (expectedReason !== actualReason) {
    console.log(`REASON for ${row.IMS_Invoice_ID} (${row.Scenario}):`)
    console.log(`  expected: "${expectedReason}"`)
    console.log(`  got:      "${actualReason}"`)
    reasonMismatches++
  }
}
if (outcomeMismatches === 0 && reasonMismatches === 0) {
  console.log('(none — all outcomes and reasons match)')
}

console.log('\n--- engine rows not present in expected ---')
let extras = 0
for (const r of results) {
  const match = expected.find(e => e.IMS_Invoice_ID === r.imsInvoiceNum && e.IMS_Supplier_GSTIN === r.imsGstin)
  if (!match) {
    console.log(`EXTRA: ${r.imsGstin}::${r.imsInvoiceNum}  result=${r.result}  reason=${r.reason}`)
    extras++
  }
}
if (extras === 0) console.log('(none)')

console.log('\n--- summary ---')
console.log(`row-count match:    ${results.length === expected.length ? 'YES' : 'NO'} (engine=${results.length}, expected=${expected.length})`)
console.log(`outcome mismatches: ${outcomeMismatches}`)
console.log(`reason mismatches:  ${reasonMismatches}`)
console.log(`extra engine rows:  ${extras}`)
process.exit(outcomeMismatches + reasonMismatches + extras > 0 || results.length !== expected.length ? 1 : 0)
