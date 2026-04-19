import Decimal from 'decimal.js'
import { normalizeDate } from '@/lib/reconciliation/normalize'

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
