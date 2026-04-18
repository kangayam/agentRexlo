import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const IDS = {
  org:           'aaaaaaaa-0000-0000-0000-000000000001',
  caAdmin:       'bbbbbbbb-0000-0000-0000-000000000001',
  caStaff:       'bbbbbbbb-0000-0000-0000-000000000002',
  clientAlpha:   'bbbbbbbb-0000-0000-0000-000000000003',
  clientBeta:    'bbbbbbbb-0000-0000-0000-000000000004',
  clientGamma:   'bbbbbbbb-0000-0000-0000-000000000005',
  alpha:         'cccccccc-0000-0000-0000-000000000001',
  beta:          'cccccccc-0000-0000-0000-000000000002',
  gamma:         'cccccccc-0000-0000-0000-000000000003',
  alphaGstin:    'dddddddd-0000-0000-0000-000000000001',
  betaGstin:     'dddddddd-0000-0000-0000-000000000002',
  gammaPrimary:  'dddddddd-0000-0000-0000-000000000003',
  gammaSecondary:'dddddddd-0000-0000-0000-000000000004',
  session:       'eeeeeeee-0000-0000-0000-000000000001',
}

interface ImsItmDet { txval: number; igst: number; cgst: number; sgst: number }
interface ImsInv {
  inum: string; idt: string; val: number; pos: string; imsaction: string
  itms: Array<{ num: number; itm_det: ImsItmDet }>
}
interface ImsSupplier { ctin: string; cname: string; inv: ImsInv[] }

function parseDate(dmy: string): Date {
  const [d, m, y] = dmy.split('-')
  return new Date(`${y}-${m}-${d}`)
}

function imsActionMap(a: string): 'ACCEPTED' | 'REJECTED' | 'PENDING' {
  if (a === 'A') return 'ACCEPTED'
  if (a === 'R') return 'REJECTED'
  return 'PENDING'
}

async function main() {
  console.log('Seeding database…')

  await prisma.reconciliationResult.deleteMany({})
  await prisma.imsInvoice.deleteMany({})
  await prisma.tallyEntry.deleteMany({})
  await prisma.uploadSession.deleteMany({})
  await prisma.clientGstin.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.teamInvite.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.client.deleteMany({})
  await prisma.organization.deleteMany({})

  const org = await prisma.organization.create({
    data: { id: IDS.org, name: 'Demo CA Associates' },
  })
  console.log('Created org:', org.name)

  await prisma.user.createMany({
    data: [
      { id: IDS.caAdmin,    name: 'Rajesh Sharma', email: 'ca_admin@demo.com', role: 'CA_ADMIN', org_id: IDS.org },
      { id: IDS.caStaff,    name: 'Priya Mehta',   email: 'staff@demo.com',    role: 'CA_STAFF', org_id: IDS.org },
      { id: IDS.clientAlpha, name: 'Anil Gupta',   email: 'alpha@demo.com',    role: 'CLIENT' },
      { id: IDS.clientBeta,  name: 'Sunita Patel', email: 'beta@demo.com',     role: 'CLIENT' },
      { id: IDS.clientGamma, name: 'Ramesh Nair',  email: 'gamma@demo.com',    role: 'CLIENT' },
    ],
  })
  console.log('Created 5 users')

  await prisma.client.createMany({
    data: [
      { id: IDS.alpha, org_id: IDS.org, name: 'Alpha Manufacturing Pvt Ltd', contact_email: 'alpha@demo.com' },
      { id: IDS.beta,  org_id: IDS.org, name: 'Beta Retail Solutions',       contact_email: 'beta@demo.com'  },
      { id: IDS.gamma, org_id: IDS.org, name: 'Gamma Services Ltd',          contact_email: 'gamma@demo.com' },
    ],
  })

  await prisma.user.update({ where: { id: IDS.clientAlpha }, data: { client_id: IDS.alpha } })
  await prisma.user.update({ where: { id: IDS.clientBeta  }, data: { client_id: IDS.beta  } })
  await prisma.user.update({ where: { id: IDS.clientGamma }, data: { client_id: IDS.gamma } })
  console.log('Created 3 clients')

  await prisma.clientGstin.createMany({
    data: [
      { id: IDS.alphaGstin,      client_id: IDS.alpha, gstin: '27AABCA1234A1Z5', is_primary: true  },
      { id: IDS.betaGstin,       client_id: IDS.beta,  gstin: '29AABCB5678B1Z3', is_primary: true  },
      { id: IDS.gammaPrimary,    client_id: IDS.gamma, gstin: '07AABCG9012C1Z1', is_primary: true  },
      { id: IDS.gammaSecondary,  client_id: IDS.gamma, gstin: '27AABCG9012C1Z2', is_primary: false },
    ],
  })
  console.log('Created 4 GSTINs')

  await prisma.uploadSession.create({
    data: {
      id:                IDS.session,
      client_gstin_id:   IDS.alphaGstin,
      period:            '2026-01',
      uploaded_by_id:    IDS.caAdmin,
      status:            'DONE',
      ims_uploaded_at:   new Date('2026-01-30T09:00:00Z'),
      tally_uploaded_at: new Date('2026-01-30T09:05:00Z'),
    },
  })
  console.log('Created upload session')

  // ── IMS Invoices ─────────────────────────────────────────────────────────
  const imsJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/sample-ims.json'), 'utf-8')
  ) as { docdata: { b2b: ImsSupplier[] } }

  const imsRows = imsJson.docdata.b2b.flatMap((supplier) =>
    supplier.inv.map((inv) => {
      const det = inv.itms[0].itm_det
      return {
        upload_session_id: IDS.session,
        supplier_gstin:    supplier.ctin,
        supplier_name:     supplier.cname,
        invoice_number:    inv.inum,
        invoice_date:      parseDate(inv.idt),
        invoice_value:     inv.val.toFixed(2),
        taxable_value:     det.txval.toFixed(2),
        igst:              det.igst.toFixed(2),
        cgst:              det.cgst.toFixed(2),
        sgst:              det.sgst.toFixed(2),
        ims_action:        imsActionMap(inv.imsaction),
        place_of_supply:   inv.pos,
      }
    })
  )

  await prisma.imsInvoice.createMany({ data: imsRows })
  console.log(`Created ${imsRows.length} IMS invoices`)

  // ── Tally Entries ─────────────────────────────────────────────────────────
  const tallyCsv = fs.readFileSync(
    path.join(process.cwd(), 'data/sample-tally.csv'), 'utf-8'
  )
  const tallyRows = tallyCsv.trim().split('\n').slice(1).map((line) => {
    const c = line.split(',')
    return {
      upload_session_id: IDS.session,
      supplier_name:  c[0].trim(),
      supplier_gstin: c[1].trim(),
      voucher_number: c[2].trim(),
      voucher_date:   parseDate(c[3].trim()),
      total_amount:   parseFloat(c[4]).toFixed(2),
      taxable_value:  parseFloat(c[5]).toFixed(2),
      igst:           parseFloat(c[6]).toFixed(2),
      cgst:           parseFloat(c[7]).toFixed(2),
      sgst:           parseFloat(c[8]).toFixed(2),
      hsn_code:       c[9]?.trim() || null,
    }
  })

  await prisma.tallyEntry.createMany({ data: tallyRows })
  console.log(`Created ${tallyRows.length} Tally entries`)

  // ── Reconciliation Results ────────────────────────────────────────────────
  const allIms   = await prisma.imsInvoice.findMany({ where: { upload_session_id: IDS.session } })
  const allTally = await prisma.tallyEntry.findMany({ where: { upload_session_id: IDS.session } })

  const imsByKey = new Map<string, typeof allIms>()
  for (const i of allIms) {
    const key = `${i.supplier_gstin}|${i.invoice_number}`
    if (!imsByKey.has(key)) imsByKey.set(key, [])
    imsByKey.get(key)!.push(i)
  }
  const tallyMap = new Map(allTally.map(t => [`${t.supplier_gstin}|${t.voucher_number}`, t]))

  type ResultRow = {
    ims_invoice_id: string
    tally_entry_id?: string
    match_level: 'EXACT' | 'VALUE_TOLERANCE' | 'SOFT_INVOICE' | 'NO_MATCH'
    outcome: 'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'
    reason_code: string
    reason_text: string
    itc_at_risk: string
  }

  const results: ResultRow[] = []

  const exactKeys = [
    '27AABCS1234A1Z5|INV/2025-26/001', '27AABCS1234A1Z5|INV/2025-26/002',
    '27AABCS1234A1Z5|INV/2025-26/003', '27AABCS1234A1Z5|INV/2025-26/004',
    '27AABCS1234A1Z5|INV/2025-26/005', '29AABCT5678B1Z3|TM/JAN/2026/006',
    '29AABCT5678B1Z3|TM/JAN/2026/007', '29AABCT5678B1Z3|TM/JAN/2026/008',
    '29AABCT5678B1Z3|TM/JAN/2026/009', '29AABCT5678B1Z3|TM/JAN/2026/010',
    '07AABCM9012C1Z1|MS/2026/011',     '07AABCM9012C1Z1|MS/2026/012',
    '07AABCM9012C1Z1|MS/2026/013',     '07AABCM9012C1Z1|MS/2026/014',
    '07AABCM9012C1Z1|MS/2026/015',     '27AABCR3456D1Z7|RT/JAN26/016',
    '27AABCR3456D1Z7|RT/JAN26/017',    '27AABCR3456D1Z7|RT/JAN26/018',
    '06AABCP7890E1Z4|PSW/2026/019',    '06AABCP7890E1Z4|PSW/2026/020',
  ]

  for (const key of exactKeys) {
    const imsArr = imsByKey.get(key)
    const ims = imsArr?.[0]
    const tally = tallyMap.get(key)
    if (!ims || !tally) continue
    results.push({ ims_invoice_id: ims.id, tally_entry_id: tally.id, match_level: 'EXACT', outcome: 'AUTO_ACCEPTED', reason_code: 'EXACT_MATCH', reason_text: 'Invoice matched exactly in your books. No action needed.', itc_at_risk: '0.00' })
  }

  const pendingReview = [
    { key: '27AABCS1234A1Z5|INV/2025-26/021', pct: '2.00' },
    { key: '29AABCT5678B1Z3|TM/JAN/2026/022', pct: '3.00' },
    { key: '07AABCM9012C1Z1|MS/2026/023',     pct: '2.22' },
  ]
  for (const r of pendingReview) {
    const ims = imsByKey.get(r.key)?.[0]
    const tally = tallyMap.get(r.key)
    if (!ims || !tally) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({ ims_invoice_id: ims.id, tally_entry_id: tally.id, match_level: 'VALUE_TOLERANCE', outcome: 'PENDING_REVIEW', reason_code: 'VALUE_VARIANCE_LOW', reason_text: `Invoice value in IMS (₹${parseFloat(ims.invoice_value).toLocaleString('en-IN')}) is ${r.pct}% higher than your books (₹${parseFloat(tally.total_amount).toLocaleString('en-IN')}). This may be freight or packing charges. Review and Accept if agreed, or mark Pending if disputed.`, itc_at_risk: itc })
  }

  const highVariance = [
    { key: '29AABCT5678B1Z3|TM/JAN/2026/024', pct: '18.33' },
    { key: '07AABCM9012C1Z1|MS/2026/025',     pct: '12.00' },
  ]
  for (const r of highVariance) {
    const ims = imsByKey.get(r.key)?.[0]
    const tally = tallyMap.get(r.key)
    if (!ims || !tally) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({ ims_invoice_id: ims.id, tally_entry_id: tally.id, match_level: 'VALUE_TOLERANCE', outcome: 'AUTO_REJECTED', reason_code: 'VALUE_VARIANCE_HIGH', reason_text: `Invoice value in IMS (₹${parseFloat(ims.invoice_value).toLocaleString('en-IN')}) is ${r.pct}% higher than your books (₹${parseFloat(tally.total_amount).toLocaleString('en-IN')}). Significant variance — Reject and ask the supplier to re-file with the correct amount.`, itc_at_risk: itc })
  }

  const gstinMismatch = [
    { key: '27AABCS1234A1Z5|INV/2025-26/026' },
    { key: '29AABCT5678B1Z3|TM/JAN/2026/027' },
  ]
  for (const r of gstinMismatch) {
    const ims = imsByKey.get(r.key)?.[0]
    const tally = tallyMap.get(r.key)
    if (!ims || !tally) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({ ims_invoice_id: ims.id, tally_entry_id: tally.id, match_level: 'EXACT', outcome: 'AUTO_REJECTED', reason_code: 'GSTIN_MISMATCH', reason_text: 'The supplier GSTIN on this invoice in IMS does not match your records. This is likely a wrong state registration. Reject and ask the supplier to re-file.', itc_at_risk: itc })
  }

  const dupArr = imsByKey.get('27AABCS1234A1Z5|INV/2025-26/001') ?? []
  if (dupArr.length === 2) {
    const dup = dupArr[1]
    const itc = (parseFloat(dup.igst) + parseFloat(dup.cgst) + parseFloat(dup.sgst)).toFixed(2)
    results.push({ ims_invoice_id: dup.id, match_level: 'NO_MATCH', outcome: 'AUTO_REJECTED', reason_code: 'DUPLICATE_INVOICE', reason_text: 'Invoice number INV/2025-26/001 appears more than once in the IMS data. Reject the duplicate and confirm the correct invoice with the supplier.', itc_at_risk: itc })
  }

  const notInBooks = ['27AABCS1234A1Z5|INV/2025-26/029', '29AABCT5678B1Z3|TM/JAN/2026/030']
  for (const key of notInBooks) {
    const ims = imsByKey.get(key)?.[0]
    if (!ims) continue
    const itc = (parseFloat(ims.igst) + parseFloat(ims.cgst) + parseFloat(ims.sgst)).toFixed(2)
    results.push({ ims_invoice_id: ims.id, match_level: 'NO_MATCH', outcome: 'NOT_IN_BOOKS', reason_code: 'NOT_IN_BOOKS', reason_text: `This invoice from ${ims.supplier_name ?? 'the supplier'} is not found in your Tally purchase register. Verify with your purchase team before Accepting on GSTN.`, itc_at_risk: itc })
  }

  await prisma.reconciliationResult.createMany({ data: results })
  console.log(`Created ${results.length} reconciliation results`)

  const counts = results.reduce((acc, r) => { acc[r.outcome] = (acc[r.outcome] ?? 0) + 1; return acc }, {} as Record<string, number>)
  console.log('Outcomes:', counts)
  console.log('✅ Seed complete. Run `npm run db:studio` to inspect.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
