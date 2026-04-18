export const REASON_CODES = {
  EXACT_MATCH:         'EXACT_MATCH',
  VALUE_VARIANCE_LOW:  'VALUE_VARIANCE_LOW',
  VALUE_VARIANCE_HIGH: 'VALUE_VARIANCE_HIGH',
  GSTIN_MISMATCH:      'GSTIN_MISMATCH',
  DUPLICATE_INVOICE:   'DUPLICATE_INVOICE',
  NOT_IN_BOOKS:        'NOT_IN_BOOKS',
  TAX_TYPE_MISMATCH:   'TAX_TYPE_MISMATCH',
  DATE_GAP:            'DATE_GAP',
  SOFT_INVOICE_MATCH:  'SOFT_INVOICE_MATCH',
} as const

export type ReasonCode = typeof REASON_CODES[keyof typeof REASON_CODES]

const TEMPLATES: Record<ReasonCode, string> = {
  EXACT_MATCH:
    'Invoice matched exactly in your books. No action needed.',
  VALUE_VARIANCE_LOW:
    'Invoice value in IMS (₹{imsValue}) is {pct}% higher than your books (₹{tallyValue}). This may be freight or packing charges. Review and Accept if agreed, or mark Pending if disputed.',
  VALUE_VARIANCE_HIGH:
    'Invoice value in IMS (₹{imsValue}) is {pct}% higher than your books (₹{tallyValue}). Significant variance — Reject and ask the supplier to re-file with the correct amount.',
  GSTIN_MISMATCH:
    'The supplier GSTIN on this invoice ({imsGstin}) does not match your records ({tallyGstin}). This is likely a wrong state registration. Reject and ask the supplier to re-file.',
  DUPLICATE_INVOICE:
    'Invoice number {invoiceNumber} appears more than once in the IMS data. Reject the duplicate and confirm the correct invoice with the supplier.',
  NOT_IN_BOOKS:
    'This invoice from {supplierName} is not found in your Tally purchase register. Verify with your purchase team before Accepting on GSTN.',
  TAX_TYPE_MISMATCH:
    'The tax type on this invoice (IGST) does not match your books (CGST+SGST). Check the Place of Supply with the supplier.',
  DATE_GAP:
    'Invoice date in IMS ({imsDate}) differs from your books ({tallyDate}) by more than 7 days. Confirm the correct date with the supplier.',
  SOFT_INVOICE_MATCH:
    'Invoice matched by value and supplier, but the invoice numbers differ ({imsNum} vs {tallyNum}). Confirm this is the same invoice before Accepting.',
}

export function buildReason(
  reasonCode: ReasonCode,
  params: Record<string, string> = {}
): string {
  let text = TEMPLATES[reasonCode]
  for (const [key, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return text
}
