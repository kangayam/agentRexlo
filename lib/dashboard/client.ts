// lib/dashboard/client.ts
import Decimal from 'decimal.js'

export type FilterChip = 'all' | 'action-required' | 'flagged' | 'not-in-books' | 'done'

export interface ReconRow {
  resultId:      string
  supplierGstin: string
  invoiceNumber: string
  invoiceDate:   string
  taxableValue:  string
  igst:          string
  cgst:          string
  sgst:          string
  itcAtRisk:     string
  matchOutcome:  'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'
  reasonCode:    string
  isDone:        boolean
  doneAt:        string | null
}

export interface SummaryCards {
  safe:       string
  atRisk:     string
  blocked:    string
  unverified: string
}

export function computeSummaryCards(rows: ReconRow[]): SummaryCards {
  let safe = new Decimal(0)
  let atRisk = new Decimal(0)
  let blocked = new Decimal(0)
  let unverified = new Decimal(0)

  for (const row of rows) {
    // isDone not checked — safe ITC is always counted regardless of done status
    if (row.matchOutcome === 'AUTO_ACCEPTED') {
      safe = safe.plus(new Decimal(row.igst)).plus(row.cgst).plus(row.sgst)
    } else if (!row.isDone) {
      const itc = new Decimal(row.itcAtRisk)
      atRisk = atRisk.plus(itc)
      if (row.matchOutcome === 'AUTO_REJECTED' || row.matchOutcome === 'NOT_IN_BOOKS') {
        blocked = blocked.plus(itc)
      }
      if (row.matchOutcome === 'PENDING_REVIEW') {
        unverified = unverified.plus(itc)
      }
    }
  }

  return {
    safe:       safe.toFixed(2),
    atRisk:     atRisk.toFixed(2),
    blocked:    blocked.toFixed(2),
    unverified: unverified.toFixed(2),
  }
}

export function filterRows(rows: ReconRow[], chip: FilterChip): ReconRow[] {
  switch (chip) {
    case 'all':
      return rows
    case 'action-required':
      return rows.filter(
        r => !r.isDone && (r.matchOutcome === 'AUTO_REJECTED' || r.matchOutcome === 'NOT_IN_BOOKS'),
      )
    case 'flagged':
      return rows.filter(r => !r.isDone && r.matchOutcome === 'PENDING_REVIEW')
    case 'not-in-books':
      return rows.filter(r => !r.isDone && r.matchOutcome === 'NOT_IN_BOOKS')
    case 'done':
      return rows.filter(r => r.isDone)
  }
}

export function countByChip(rows: ReconRow[]): Record<FilterChip, number> {
  return {
    all:               rows.length,
    'action-required': rows.filter(
      r => !r.isDone && (r.matchOutcome === 'AUTO_REJECTED' || r.matchOutcome === 'NOT_IN_BOOKS'),
    ).length,
    flagged:           rows.filter(r => !r.isDone && r.matchOutcome === 'PENDING_REVIEW').length,
    'not-in-books':    rows.filter(r => !r.isDone && r.matchOutcome === 'NOT_IN_BOOKS').length,
    done:              rows.filter(r => r.isDone).length,
  }
}
