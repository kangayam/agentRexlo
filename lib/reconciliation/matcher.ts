import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyEntry } from '@/lib/parsers/tally-excel-parser'

export type MatchLevel = 'EXACT' | 'VALUE_TOLERANCE' | 'SOFT_INVOICE' | 'NO_MATCH'

export interface MatchResult {
  level: MatchLevel
  tallyEntryIndex: number | null
}

export function matchInvoice(
  _ims: NormalizedImsInvoice,
  _tally: NormalizedTallyEntry[]
): MatchResult {
  // TODO: implement in recon sprint — Level 1/2/3 matching
  throw new Error('matchInvoice: not yet implemented')
}
