import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { MatchResult } from '@/lib/reconciliation/matcher'

export type ReconciliationOutcome =
  | 'AUTO_ACCEPTED'
  | 'AUTO_REJECTED'
  | 'PENDING_REVIEW'
  | 'NOT_IN_BOOKS'

export function applyRules(
  _ims: NormalizedImsInvoice,
  _match: MatchResult
): ReconciliationOutcome {
  // TODO: implement in recon sprint
  throw new Error('applyRules: not yet implemented')
}
