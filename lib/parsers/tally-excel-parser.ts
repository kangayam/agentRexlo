export interface TallyColumnMap {
  supplierName: string
  supplierGstin: string
  voucherNumber: string
  voucherDate: string
  totalAmount: string
  taxableValue: string
  igst: string
  cgst: string
  sgst: string
  hsnCode: string
}

export const DEFAULT_TALLY_COLUMN_MAP: TallyColumnMap = {
  supplierName:  'Supplier Name',
  supplierGstin: 'Party GSTIN',
  voucherNumber: 'Voucher Number',
  voucherDate:   'Voucher Date',
  totalAmount:   'Total Amount',
  taxableValue:  'Taxable Value',
  igst:          'IGST Amount',
  cgst:          'CGST Amount',
  sgst:          'SGST Amount',
  hsnCode:       'HSN Code',
}

export interface NormalizedTallyEntry {
  supplierName: string
  supplierGstin: string
  voucherNumber: string
  voucherDate: Date
  totalAmount: string
  taxableValue: string
  igst: string
  cgst: string
  sgst: string
  hsnCode: string | null
}

export function parseTallyFile(
  _content: string,
  _columnMap?: TallyColumnMap
): NormalizedTallyEntry[] {
  // TODO: implement in parsers sprint
  throw new Error('parseTallyFile: not yet implemented')
}

export function detectColumnMap(_headers: string[]): TallyColumnMap | null {
  // TODO: implement in parsers sprint — returns null if auto-detection fails
  throw new Error('detectColumnMap: not yet implemented')
}
