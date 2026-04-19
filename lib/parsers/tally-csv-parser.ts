import Decimal from 'decimal.js'
import Papa from 'papaparse'
import { normalizeDate } from '@/lib/reconciliation/normalize'

export interface NormalizedTallyRow {
  supplierGstin: string
  supplierName: string
  invoiceNum: string
  invoiceDate: string   // ISO 8601
  taxableValue: Decimal
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  totalAmount: Decimal
}

export function parseTallyCsv(csv: string): NormalizedTallyRow[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  return data.map(row => ({
    supplierGstin: row['Supplier GSTIN'].trim(),
    supplierName: row['Supplier Name'].trim(),
    invoiceNum: row['Invoice Number'].trim(),
    invoiceDate: normalizeDate(row['Invoice Date'].trim()),
    taxableValue: new Decimal(row['Taxable Value'] || '0'),
    igst: new Decimal(row['IGST Amount'] || '0'),
    cgst: new Decimal(row['CGST Amount'] || '0'),
    sgst: new Decimal(row['SGST Amount'] || '0'),
    totalAmount: new Decimal(row['Total Amount'] || '0'),
  }))
}
