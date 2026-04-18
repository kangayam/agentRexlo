export interface NormalizedImsInvoice {
  supplierGstin: string
  supplierName: string | null
  invoiceNumber: string
  invoiceDate: Date
  invoiceValue: string
  taxableValue: string
  igst: string
  cgst: string
  sgst: string
  imsAction: 'ACCEPTED' | 'REJECTED' | 'PENDING'
  placeOfSupply: string | null
  hsnCode: string | null
}

export function parseImsJson(_json: unknown): NormalizedImsInvoice[] {
  // TODO: implement in parsers sprint
  throw new Error('parseImsJson: not yet implemented')
}
