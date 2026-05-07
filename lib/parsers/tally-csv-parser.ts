import Decimal from 'decimal.js'
import Papa from 'papaparse'
import { normalizeDate } from '@/lib/reconciliation/normalize'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'
import { DEFAULT_TALLY_COLUMN_MAP, detectColumnMap } from '@/lib/parsers/tally-excel-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-excel-parser'

// Re-export NormalizedTallyRow so existing imports from this module still work.
export type { NormalizedTallyRow } from '@/lib/parsers/tally-excel-parser'

export function parseTallyCsv(csv: string, columnMap?: TallyColumnMap): NormalizedTallyRow[] {
  const { data, meta } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  // Auto-detect column names from actual headers when no map is provided
  const map = columnMap ?? detectColumnMap(meta.fields ?? []) ?? DEFAULT_TALLY_COLUMN_MAP

  return data
    .filter(row => row[map.supplierGstin]?.trim())
    .map(row => ({
      supplierGstin:  (row[map.supplierGstin]  ?? '').trim(),
      supplierName:   (row[map.supplierName]   ?? '').trim(),
      invoiceNum:     (row[map.voucherNumber]  ?? '').trim(),
      invoiceDate:    normalizeDate((row[map.voucherDate] ?? '').trim()),
      taxableValue:   new Decimal(row[map.taxableValue]  || '0'),
      igst:           new Decimal(row[map.igst]          || '0'),
      cgst:           new Decimal(row[map.cgst]          || '0'),
      sgst:           new Decimal(row[map.sgst]          || '0'),
      totalAmount:    new Decimal(row[map.totalAmount]   || '0'),
    }))
}
