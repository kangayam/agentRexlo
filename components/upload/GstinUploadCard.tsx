'use client'

import { useState, useCallback, useRef } from 'react'
import { AlertTriangle, Check, RotateCcw } from 'lucide-react'
import { FileDropZone, DropZoneStatus } from '@/components/upload/FileDropZone'
import { PeriodPicker } from '@/components/upload/PeriodPicker'
import { ColumnMappingModal } from '@/components/upload/ColumnMappingModal'
import { extractTallyFileInfo } from '@/lib/parsers/tally-column-detect'
import type { TallyFileInfo } from '@/lib/parsers/tally-column-detect'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'
import { formatPeriod } from '@/lib/format'

export interface SessionState {
  sessionId: string | null
  status:    string | null
  imsUploadedAt:   string | null
  imsCount:        number
  tallyUploadedAt: string | null
  tallyCount:      number
}

interface GstinUploadCardProps {
  clientGstinId: string
  gstin:         string
  stateName:     string
  defaultPeriod: string
  initialSession: SessionState
}

type ZoneState = { status: DropZoneStatus; error?: string | null }

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function GstinUploadCard({
  clientGstinId,
  gstin,
  stateName,
  defaultPeriod,
  initialSession,
}: GstinUploadCardProps) {
  const [period, setPeriod] = useState(defaultPeriod)
  const [session, setSession] = useState<SessionState>(initialSession)
  const [imsZone, setImsZone]     = useState<ZoneState>({ status: initialSession.imsUploadedAt ? 'done' : 'empty' })
  const [tallyZone, setTallyZone] = useState<ZoneState>({ status: initialSession.tallyUploadedAt ? 'done' : 'empty' })

  // Re-upload confirmation modals
  const [showImsModal, setShowImsModal]     = useState(false)
  const [showTallyModal, setShowTallyModal] = useState(false)

  // Hidden file inputs — triggered programmatically after modal confirm
  const imsInputRef   = useRef<HTMLInputElement>(null)
  const tallyInputRef = useRef<HTMLInputElement>(null)

  // Column mapping state
  const [pendingTallyFile, setPendingTallyFile] = useState<File | null>(null)
  const [tallyFileInfo, setTallyFileInfo]       = useState<TallyFileInfo | null>(null)
  const [mappingModalOpen, setMappingModalOpen] = useState(false)

  // Derived upload state
  const imsUploaded   = !!session.imsUploadedAt
  const tallyUploaded = !!session.tallyUploadedAt
  const bothUploaded  = imsUploaded && tallyUploaded
  const imsUploadDate   = fmtDate(session.imsUploadedAt)
  const tallyUploadDate = fmtDate(session.tallyUploadedAt)
  const imsFileName = `ims-${period}.json`

  async function submit(file: File, type: 'ims' | 'tally', columnMap?: TallyColumnMap) {
    const setter = type === 'ims' ? setImsZone : setTallyZone
    setter({ status: 'uploading' })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    fd.append('clientGstinId', clientGstinId)
    fd.append('period', period)
    if (columnMap) fd.append('columnMapping', JSON.stringify(columnMap))

    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Upload failed' }))
      setter({ status: 'error', error: (body as { error?: string }).error ?? 'Upload failed' })
      return
    }

    const data = await res.json() as SessionState & { reconOutcomes?: Record<string, number> }
    setSession(data)
    setImsZone({ status: data.imsUploadedAt ? 'done' : 'empty' })
    setTallyZone({ status: data.tallyUploadedAt ? 'done' : 'empty' })
  }

  // ── IMS handlers ──────────────────────────────────────────────────────────

  const handleImsFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setImsZone({ status: 'error', error: 'IMS must be a .json file' })
      return
    }
    await submit(file, 'ims')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, clientGstinId])

  async function handleImsInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!file.name.endsWith('.json')) {
      setImsZone({ status: 'error', error: 'IMS must be a .json file' })
      return
    }
    await submit(file, 'ims')
  }

  function handleImsConfirmReplace() {
    setShowImsModal(false)
    if (imsInputRef.current) {
      imsInputRef.current.value = ''
      imsInputRef.current.click()
    }
  }

  // ── Tally handlers ────────────────────────────────────────────────────────

  const handleTallyFile = useCallback(async (file: File) => {
    const info = await extractTallyFileInfo(file)
    if (!info.detectedMap) {
      setPendingTallyFile(file)
      setTallyFileInfo(info)
      setMappingModalOpen(true)
    } else {
      await submit(file, 'tally', info.detectedMap)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, clientGstinId])

  async function handleTallyInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const info = await extractTallyFileInfo(file)
    if (!info.detectedMap) {
      setPendingTallyFile(file)
      setTallyFileInfo(info)
      setMappingModalOpen(true)
    } else {
      await submit(file, 'tally', info.detectedMap)
    }
  }

  function handleTallyConfirmReplace() {
    setShowTallyModal(false)
    if (tallyInputRef.current) {
      tallyInputRef.current.value = ''
      tallyInputRef.current.click()
    }
  }

  function handleMappingConfirm(map: TallyColumnMap) {
    setMappingModalOpen(false)
    if (pendingTallyFile) submit(pendingTallyFile, 'tally', map)
    setPendingTallyFile(null)
  }

  function handleMappingCancel() {
    setMappingModalOpen(false)
    setPendingTallyFile(null)
    setTallyFileInfo(null)
  }

  async function handlePeriodChange(newPeriod: string) {
    setPeriod(newPeriod)
    const res = await fetch(`/api/upload?clientGstinId=${clientGstinId}&period=${newPeriod}`)
    const data = await res.json() as SessionState
    setSession(data)
    setImsZone({ status: data.imsUploadedAt ? 'done' : 'empty' })
    setTallyZone({ status: data.tallyUploadedAt ? 'done' : 'empty' })
  }

  return (
    <div>
      {/* ── CHANGE 1: Progress indicator ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex items-center gap-4">

        {/* Step 1 — IMS */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            imsUploaded ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-400'
          }`}>
            {imsUploaded ? '✓' : '1'}
          </div>
          <div>
            <p className={`text-xs font-semibold ${imsUploaded ? 'text-slate-900' : 'text-slate-400'}`}>
              IMS JSON uploaded
            </p>
            <p className="text-[10px] text-slate-400">
              {imsUploaded ? `${session.imsCount} invoices · ${imsUploadDate}` : 'Upload GSTN IMS export'}
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className={`h-px w-8 flex-shrink-0 ${imsUploaded ? 'bg-green-500' : 'bg-slate-200'}`} />

        {/* Step 2 — Tally */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            tallyUploaded
              ? 'bg-green-600 text-white'
              : imsUploaded
                ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                : 'bg-slate-200 text-slate-400'
          }`}>
            {tallyUploaded ? '✓' : '2'}
          </div>
          <div>
            <p className={`text-xs font-semibold ${
              tallyUploaded ? 'text-slate-900' : imsUploaded ? 'text-amber-700' : 'text-slate-400'
            }`}>
              {tallyUploaded ? 'Tally CSV uploaded' : 'Upload Tally CSV'}
            </p>
            <p className="text-[10px] text-slate-400">
              {tallyUploaded ? `${session.tallyCount} rows · ${tallyUploadDate}` : 'Waiting for your upload'}
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className={`h-px w-8 flex-shrink-0 ${tallyUploaded ? 'bg-green-500' : 'bg-slate-200'}`} />

        {/* Step 3 — Reconciliation */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            bothUploaded ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
          }`}>
            {bothUploaded ? '⚡' : '3'}
          </div>
          <div>
            <p className={`text-xs font-semibold ${bothUploaded ? 'text-blue-700' : 'text-slate-400'}`}>
              Reconciliation runs
            </p>
            <p className="text-[10px] text-slate-400">Auto-starts after both uploads</p>
          </div>
        </div>
      </div>

      {/* ── GSTIN card ───────────────────────────────────────────────────── */}
      <div className={`rounded-xl border bg-white overflow-hidden ${
        session.status === 'DONE'  ? 'border-emerald-200' :
        session.status === 'ERROR' ? 'border-red-200' :
        imsUploaded || tallyUploaded ? 'border-amber-200' :
        'border-gray-200'
      }`}>

        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{gstin}</span>
            <span className="text-gray-400 text-xs">{stateName}</span>

            {/* ── CHANGE 4: Status badge ─────────────────────────────── */}
            {imsUploaded && !tallyUploaded && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                Tally pending
              </span>
            )}
            {tallyUploaded && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                Complete
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Period:</span>
            <PeriodPicker value={period} onChange={handlePeriodChange} />
          </div>
        </div>

        {/* Upload zones */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">

            {/* ── CHANGE 2: IMS zone (custom done state) ─────────────── */}
            {imsZone.status === 'done' && session.imsUploadedAt ? (
              <div className="border-2 border-green-500 rounded-xl bg-green-50 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-green-800">IMS JSON</p>
                      <p className="text-xs font-mono text-green-600 mt-0.5 truncate max-w-[180px]">
                        {imsFileName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {session.imsCount} invoices · Uploaded {imsUploadDate}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowImsModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-50 transition-colors flex-shrink-0 ml-3"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Re-upload
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-white border border-green-200 rounded-md px-2.5 py-1 text-xs font-semibold text-green-700">
                    <Check className="w-3 h-3" />
                    Ready to reconcile
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white border border-green-200 rounded-md px-2.5 py-1 text-xs font-semibold text-green-700">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="9" x2="9" y2="21" />
                    </svg>
                    {session.imsCount} invoices
                  </span>
                </div>
              </div>
            ) : (
              <FileDropZone
                type="ims"
                uploadedAt={session.imsUploadedAt}
                uploadedCount={session.imsCount}
                status={imsZone.status}
                errorMessage={imsZone.error}
                onFile={handleImsFile}
                onReupload={() => setShowImsModal(true)}
              />
            )}

            {/* Tally zone — uses FileDropZone for all states */}
            <FileDropZone
              type="tally"
              uploadedAt={session.tallyUploadedAt}
              uploadedCount={session.tallyCount}
              status={tallyZone.status}
              errorMessage={tallyZone.error}
              onFile={handleTallyFile}
              onReupload={() => setShowTallyModal(true)}
            />
          </div>

          {/* ── CHANGE 3: Tally export instructions ──────────────────── */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              How to export from Tally
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { text: 'Gateway of Tally', bold: true },
                { text: '→', bold: false },
                { text: 'Display', bold: true },
                { text: '→', bold: false },
                { text: 'Account Books', bold: true },
                { text: '→', bold: false },
                { text: 'Purchase Register', bold: true },
                { text: '→', bold: false },
                { text: 'Set period', bold: false },
                { text: '→', bold: false },
                { text: 'Export → Excel/CSV', bold: true },
              ].map((item, i) => (
                <span
                  key={i}
                  className={`text-[10.5px] ${item.bold ? 'font-semibold text-slate-600' : 'text-slate-300'}`}
                >
                  {item.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden inputs for re-upload (triggered programmatically after modal confirm) */}
      <input ref={imsInputRef}   type="file" accept=".json"           className="hidden" onChange={handleImsInputChange} />
      <input ref={tallyInputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleTallyInputChange} />

      {/* IMS replace confirmation modal */}
      {showImsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Replace existing IMS data?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              {formatPeriod(period)} already has <strong>{session.imsCount} invoices</strong> uploaded on {imsUploadDate}. Uploading a new file will permanently replace all existing IMS data for this period.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowImsModal(false)}
                className="flex-1 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleImsConfirmReplace}
                className="flex-1 h-9 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
              >
                Yes, replace it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tally replace confirmation modal */}
      {showTallyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Replace existing Tally data?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              {formatPeriod(period)} already has <strong>{session.tallyCount} entries</strong> uploaded on {tallyUploadDate}. Uploading a new file will permanently replace all existing Tally data for this period.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowTallyModal(false)}
                className="flex-1 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleTallyConfirmReplace}
                className="flex-1 h-9 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
              >
                Yes, replace it
              </button>
            </div>
          </div>
        </div>
      )}

      <ColumnMappingModal
        open={mappingModalOpen}
        fileInfo={tallyFileInfo}
        onConfirm={handleMappingConfirm}
        onCancel={handleMappingCancel}
      />
    </div>
  )
}
