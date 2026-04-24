import Decimal from 'decimal.js'
import * as XLSX from 'xlsx'
import { normalizeDate } from '@/lib/reconciliation/normalize'

// NormalizedTallyRow lives here (not in tally-csv-parser) to avoid a circular import.
export interface NormalizedTallyRow {
  supplierGstin: string
  supplierName:  string
  invoiceNum:    string
  invoiceDate:   string   // ISO 8601
  taxableValue:  Decimal
  igst:          Decimal
  cgst:          Decimal
  sgst:          Decimal
  totalAmount:   Decimal
}

export interface TallyColumnMap {
  supplierName:  string
  supplierGstin: string
  voucherNumber: string
  voucherDate:   string
  totalAmount:   string
  taxableValue:  string
  igst:          string
  cgst:          string
  sgst:          string
  hsnCode:       string
}

export const DEFAULT_TALLY_COLUMN_MAP: TallyColumnMap = {
  supplierName:  'Supplier Name',
  supplierGstin: 'Supplier GSTIN',
  voucherNumber: 'Invoice Number',
  voucherDate:   'Invoice Date',
  totalAmount:   'Total Amount',
  taxableValue:  'Taxable Value',
  igst:          'IGST Amount',
  cgst:          'CGST Amount',
  sgst:          'SGST Amount',
  hsnCode:       'HSN Code',
}

// Aliases for each required field (case-insensitive matching)
const ALIASES: Record<keyof TallyColumnMap, string[]> = {
  supplierGstin: ['supplier gstin', 'party gstin', 'gstin', 'vendor gstin', 'tax registration no'],
  supplierName:  ['supplier name', 'ledger name', 'party name', 'vendor name'],
  voucherNumber: ['invoice number', 'voucher no', 'voucher number', 'bill no', 'ref no', 'bill reference', 'invoice no'],
  voucherDate:   ['invoice date', 'voucher date', 'bill date', 'date', 'posting date'],
  taxableValue:  ['taxable value', 'taxable amount', 'taxable amt', 'basic amount'],
  igst:          ['igst amount', 'igst amt', 'integrated tax', 'igst'],
  cgst:          ['cgst amount', 'cgst amt', 'central tax', 'cgst'],
  sgst:          ['sgst amount', 'sgst amt', 'state tax', 'sgst'],
  totalAmount:   ['total amount', 'total amt', 'invoice value', 'total'],
  hsnCode:       ['hsn code', 'hsn', 'hsn/sac'],
}

const REQUIRED_FIELDS: Array<keyof TallyColumnMap> = [
  'supplierGstin', 'supplierName', 'voucherNumber', 'voucherDate',
  'taxableValue', 'igst', 'cgst', 'sgst', 'totalAmount',
]

export function detectColumnMap(headers: string[]): TallyColumnMap | null {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())
  const result = {} as TallyColumnMap

  for (const field of Object.keys(ALIASES) as Array<keyof TallyColumnMap>) {
    const aliases = ALIASES[field]
    const matchedIdx = lowerHeaders.findIndex(h => aliases.includes(h))
    result[field] = matchedIdx >= 0 ? headers[matchedIdx] : ''
  }

  const allRequiredMatched = REQUIRED_FIELDS.every(f => result[f] !== '')
  return allRequiredMatched ? result : null
}

export function parseTallyFile(content: string | ArrayBuffer, columnMap?: TallyColumnMap): NormalizedTallyRow[] {
  const map = columnMap ?? DEFAULT_TALLY_COLUMN_MAP

  let rows: Record<string, string>[]
  try {
    const wb = XLSX.read(content, { type: typeof content === 'string' ? 'string' : 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  } catch {
    // Plain CSV fallback
    const text = typeof content === 'string' ? content : Buffer.from(content).toString('utf-8')
    const lines = text.split('\n').filter(Boolean)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
    })
  }

  return rows
    .filter(row => row[map.supplierGstin]?.trim())
    .map(row => ({
      supplierGstin: (row[map.supplierGstin] ?? '').trim(),
      supplierName:  (row[map.supplierName]  ?? '').trim(),
      invoiceNum:    (row[map.voucherNumber] ?? '').trim(),
      invoiceDate:   normalizeDate((row[map.voucherDate] ?? '').trim()),
      taxableValue:  new Decimal(row[map.taxableValue]  || '0'),
      igst:          new Decimal(row[map.igst]          || '0'),
      cgst:          new Decimal(row[map.cgst]          || '0'),
      sgst:          new Decimal(row[map.sgst]          || '0'),
      totalAmount:   new Decimal(row[map.totalAmount]   || '0'),
    }))
}
