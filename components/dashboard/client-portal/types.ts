export interface ReconResult {
  id:            string
  result:        'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'
  reasonCode:    string
  supplierGstin: string
  invoiceNo:     string
  invoiceDate:   string
  igst:          number
  cgst:          number
  sgst:          number
  itcAtRisk:     number
  isDone:        boolean
}

export interface FilingPeriod {
  period:          string
  gstin:           string
  status:          string
  imsUploadedAt:   string | null
  tallyUploadedAt: string | null
  uploadedBy:      string
  matched:         number
  rejected:        number
  review:          number
  notInBooks:      number
}

export interface ComputedDashboard {
  itcSafe:        number
  itcAtRisk:      number
  itcBlocked:     number
  itcUnverified:  number
  actionQueue:    ReconResult[]
  completed:      ReconResult[]
  leakage: {
    supplierNotFiled: number
    valueMismatch:    number
    pendingReview:    number
  }
  aging: {
    d30:     number
    d60:     number
    d90:     number
    d90plus: number
  }
  qualityScore:   number
  qualityBand:    string
  autoAcceptPct:  number
  recoveryRate:   number
}
