import Decimal from 'decimal.js'
import { normalizeDate } from '@/lib/reconciliation/normalize'

// ── Format-agnostic IMS parser ────────────────────────────────────────────────

export interface ParsedIMSInvoice {
  supplierGstin: string
  invoiceNo:     string
  invoiceDate:   Date | null
  taxableValue:  number
  igst:          number
  cgst:          number
  sgst:          number
  totalValue:    number
  pos?:          string
}

export interface ParsedIMSFile {
  gstin:    string
  period:   string
  invoices: ParsedIMSInvoice[]
  format:   string
}

export function parseIMSJson(raw: unknown): ParsedIMSFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(
      'Invalid file — could not read as JSON. ' +
      'Please download from GSTN → IMS tab → Export JSON.'
    )
  }

  const obj = raw as Record<string, unknown>

  const gstin  = findString(raw, ['gstin', 'GSTIN', 'recipient_gstin', 'buyer_gstin', 'gstr2b_gstin'])
  const period = findString(raw, ['ret_period', 'period', 'tax_period', 'return_period', 'fp'])

  // ── GSTN docdata.b2b — supplier-grouped structure ──────────────────────────
  if (typeof obj.docdata === 'object' && obj.docdata !== null) {
    const docdata = obj.docdata as Record<string, unknown>
    if (Array.isArray(docdata.b2b)) {
      const invoices: ParsedIMSInvoice[] = []
      for (const supplier of docdata.b2b) {
        const supplierGstin = findString(supplier, ['ctin', 'gstin', 'stin', 'supplier_gstin']) ?? ''
        const invArr = findArray(supplier, ['inv', 'invoices', 'invoice_list'])
        if (!invArr) continue
        for (const inv of invArr) {
          const extracted = extractInvoice(inv)
          if (supplierGstin) extracted.supplierGstin = supplierGstin
          if (isValidInvoice(extracted)) invoices.push(extracted)
        }
      }
      if (invoices.length > 0) {
        return { gstin: gstin ?? '', period: period ?? '', invoices, format: 'gstn-docdata-b2b' }
      }
    }
  }

  // ── General: find an invoice array at the top level ────────────────────────
  const invoiceArray = findArray(raw, [
    'data', 'invoices', 'records', 'b2b', 'items', 'inv', 'invoice_list',
  ])

  if (!invoiceArray || invoiceArray.length === 0) {
    const rootArray = Array.isArray(raw) ? raw : null
    if (!rootArray || rootArray.length === 0) {
      throw new Error(
        'No invoices found in this file. ' +
        'Please check you exported the correct file from GSTN.'
      )
    }
    const invoices = rootArray.map(extractInvoice).filter(isValidInvoice)
    if (invoices.length === 0) {
      throw new Error(
        'No valid invoices found — make sure the file has supplier GSTIN and invoice numbers. ' +
        'Contact your CA if the issue continues.'
      )
    }
    return { gstin: gstin ?? '', period: period ?? '', invoices, format: 'root-array' }
  }

  const invoices = invoiceArray.map(extractInvoice).filter(isValidInvoice)

  if (invoices.length === 0) {
    throw new Error(
      'No valid invoices found — make sure the file has supplier GSTIN and invoice numbers. ' +
      'Contact your CA if the issue continues.'
    )
  }

  console.log(`IMS parser: ${invoices.length} invoices, gstin=${gstin}, period=${period}`)
  return { gstin: gstin ?? '', period: period ?? '', invoices, format: 'auto' }
}

function extractInvoice(item: unknown): ParsedIMSInvoice {
  if (typeof item !== 'object' || item === null) return emptyInvoice()

  const supplierGstin = findString(item, [
    'stin', 'supplier_gstin', 'ctin', 'gstin', 'supplier_gst', 'party_gstin', 'counter_party_gstin',
  ]) ?? ''

  const invoiceNo = findString(item, [
    'inum', 'invoice_no', 'inv_no', 'invoice_number', 'bill_no', 'doc_num', 'voucher_no', 'ref_no',
  ]) ?? ''

  const rawDate = findString(item, [
    'idt', 'invoice_date', 'inv_date', 'date', 'bill_date', 'doc_date', 'voucher_date',
  ])
  const invoiceDate = rawDate ? parseAnyDate(rawDate) : null

  const pos = findString(item, ['pos', 'place_of_supply', 'place_supply', 'supply_state']) ?? undefined

  let taxableValue = findNumber(item, ['txval', 'taxable_value', 'taxable_amt', 'assessable_value', 'base_amount'])
  let igst         = findNumber(item, ['iamt', 'igst', 'igst_amt', 'igst_amount', 'integrated_tax'])
  let cgst         = findNumber(item, ['camt', 'cgst', 'cgst_amt', 'cgst_amount', 'central_tax'])
  let sgst         = findNumber(item, ['samt', 'sgst', 'sgst_amt', 'sgst_amount', 'state_tax', 'utgst', 'utgst_amt'])
  const totalValue = findNumber(item, ['val', 'total', 'total_value', 'invoice_value', 'gross_amount', 'total_amount'])

  // Dig into itms[0].itm_det if flat fields not found (GSTN standard)
  const obj = item as Record<string, unknown>
  if (taxableValue === 0 && Array.isArray(obj.itms) && obj.itms.length > 0) {
    const det = (obj.itms[0] as Record<string, unknown>)?.itm_det as Record<string, unknown> ?? {}
    taxableValue = Number(det.txval ?? 0)
    igst         = Number(det.iamt  ?? 0)
    cgst         = Number(det.camt  ?? 0)
    sgst         = Number(det.samt  ?? 0)
    // Sum across all itms
    for (let i = 1; i < (obj.itms as unknown[]).length; i++) {
      const d = (obj.itms as Record<string, unknown>[])[i]?.itm_det as Record<string, unknown> ?? {}
      taxableValue += Number(d.txval ?? 0)
      igst         += Number(d.iamt  ?? 0)
      cgst         += Number(d.camt  ?? 0)
      sgst         += Number(d.samt  ?? 0)
    }
  }

  if (taxableValue === 0 && obj.itm_det) {
    const det = obj.itm_det as Record<string, unknown>
    taxableValue = Number(det.txval ?? 0)
    igst         = Number(det.iamt  ?? 0)
    cgst         = Number(det.camt  ?? 0)
    sgst         = Number(det.samt  ?? 0)
  }

  return {
    supplierGstin,
    invoiceNo,
    invoiceDate,
    taxableValue,
    igst,
    cgst,
    sgst,
    totalValue: totalValue || (taxableValue + igst + cgst + sgst),
    pos,
  }
}

function isValidInvoice(inv: ParsedIMSInvoice): boolean {
  return inv.supplierGstin.length > 0 && inv.invoiceNo.length > 0
}

function emptyInvoice(): ParsedIMSInvoice {
  return { supplierGstin: '', invoiceNo: '', invoiceDate: null, taxableValue: 0, igst: 0, cgst: 0, sgst: 0, totalValue: 0 }
}

function findString(obj: unknown, keys: string[]): string | null {
  if (typeof obj !== 'object' || obj === null) return null
  const o = obj as Record<string, unknown>
  for (const key of keys) {
    if (typeof o[key] === 'string' && (o[key] as string) !== '') return o[key] as string
  }
  return null
}

function findNumber(obj: unknown, keys: string[]): number {
  if (typeof obj !== 'object' || obj === null) return 0
  const o = obj as Record<string, unknown>
  for (const key of keys) {
    const val = o[key]
    if (typeof val === 'number' && !isNaN(val)) return val
    if (typeof val === 'string' && val !== '') { const n = parseFloat(val); if (!isNaN(n)) return n }
  }
  return 0
}

function findArray(obj: unknown, keys: string[]): unknown[] | null {
  if (typeof obj !== 'object' || obj === null) return null
  const o = obj as Record<string, unknown>
  for (const key of keys) {
    if (Array.isArray(o[key]) && (o[key] as unknown[]).length > 0) return o[key] as unknown[]
  }
  return null
}

function parseAnyDate(dateStr: string): Date | null {
  if (!dateStr) return null
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-')
    return new Date(Date.UTC(+y, +m - 1, +d))
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/')
    return new Date(Date.UTC(+y, +m - 1, +d))
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr)
  const native = new Date(dateStr)
  return isNaN(native.getTime()) ? null : native
}

// ─────────────────────────────────────────────────────────────────────────────

export interface NormalizedImsInvoice {
  supplierGstin: string
  invoiceNum: string
  invoiceDate: string   // ISO 8601
  totalValue: Decimal
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  pos: string
}

interface ImsItemDet {
  rt: number
  txval: number
  iamt: number
  camt: number
  samt: number
  csamt: number
}

interface ImsItem {
  num: number
  itm_det: ImsItemDet
}

interface ImsInv {
  inum: string
  idt: string
  val: number
  pos: string
  itc_avl: string
  itms: ImsItem[]
}

interface ImsSupplier {
  ctin: string
  inv: ImsInv[]
}

interface ImsJson {
  gstin: string
  ret_period: string
  docdata: { b2b: ImsSupplier[] }
}

export function parseImsJson(json: string): NormalizedImsInvoice[] {
  const raw = JSON.parse(json) as ImsJson
  const results: NormalizedImsInvoice[] = []

  for (const supplier of raw.docdata.b2b) {
    for (const inv of supplier.inv) {
      let igst = new Decimal(0)
      let cgst = new Decimal(0)
      let sgst = new Decimal(0)

      for (const item of inv.itms) {
        igst = igst.plus(item.itm_det.iamt)
        cgst = cgst.plus(item.itm_det.camt)
        sgst = sgst.plus(item.itm_det.samt)
      }

      results.push({
        supplierGstin: supplier.ctin,
        invoiceNum: inv.inum,
        invoiceDate: normalizeDate(inv.idt),
        totalValue: new Decimal(inv.val),
        igst,
        cgst,
        sgst,
        pos: inv.pos,
      })
    }
  }

  return results
}
