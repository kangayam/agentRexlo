'use client'

import { useState, useCallback } from 'react'
import { FileDropZone, DropZoneStatus } from '@/components/upload/FileDropZone'
import { PeriodPicker } from '@/components/upload/PeriodPicker'
import { ColumnMappingModal } from '@/components/upload/ColumnMappingModal'
import { extractTallyFileInfo } from '@/lib/parsers/tally-column-detect'
import type { TallyFileInfo } from '@/lib/parsers/tally-column-detect'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'

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

const statusBadge: Record<string, { label: string; className: string }> = {
  DONE:       { label: 'Reconciled',    className: 'bg-emerald-100 text-emerald-800' },
  PROCESSING: { label: 'Processing…',  className: 'bg-blue-100 text-blue-800' },
  ERROR:      { label: 'Upload failed', className: 'bg-red-100 text-red-800' },
  PENDING:    { label: 'Pending',       className: 'bg-gray-100 text-gray-600' },
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

  // Column mapping state
  const [pendingTallyFile, setPendingTallyFile] = useState<File | null>(null)
  const [tallyFileInfo, setTallyFileInfo]       = useState<TallyFileInfo | null>(null)
  const [mappingModalOpen, setMappingModalOpen] = useState(false)

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

  const handleImsFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setImsZone({ status: 'error', error: 'IMS must be a .json file' })
      return
    }
    const text = await file.text()
    if (!text.includes('docdata')) {
      setImsZone({ status: 'error', error: "This doesn't look like a GSTN IMS export. Download from GSTN → IMS tab → Export JSON." })
      return
    }
    await submit(file, 'ims')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, clientGstinId])

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

  const badge = session.status
    ? (statusBadge[session.status] ?? { label: 'No upload', className: 'bg-gray-100 text-gray-500' })
    : { label: 'No upload', className: 'bg-gray-100 text-gray-500' }

  // Derive Tally pending / IMS pending badge overrides
  const derivedBadge = (() => {
    if (session.status === 'DONE') return badge
    if (session.imsUploadedAt && !session.tallyUploadedAt) return { label: 'Tally pending', className: 'bg-amber-100 text-amber-800' }
    if (!session.imsUploadedAt && session.tallyUploadedAt) return { label: 'IMS pending', className: 'bg-amber-100 text-amber-800' }
    return badge
  })()

  return (
    <>
      <div className={`rounded-xl border bg-white overflow-hidden ${
        session.status === 'DONE'  ? 'border-emerald-200' :
        session.status === 'ERROR' ? 'border-red-200' :
        session.imsUploadedAt || session.tallyUploadedAt ? 'border-amber-200' :
        'border-gray-200'
      }`}>
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{gstin}</span>
            <span className="text-gray-400 text-xs">{stateName}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${derivedBadge.className}`}>
              {derivedBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Period:</span>
            <PeriodPicker value={period} onChange={handlePeriodChange} />
          </div>
        </div>

        {/* Upload zones */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <FileDropZone
            type="ims"
            uploadedAt={session.imsUploadedAt}
            uploadedCount={session.imsCount}
            status={imsZone.status}
            errorMessage={imsZone.error}
            onFile={handleImsFile}
            onReupload={() => setImsZone({ status: 'empty' })}
          />
          <FileDropZone
            type="tally"
            uploadedAt={session.tallyUploadedAt}
            uploadedCount={session.tallyCount}
            status={tallyZone.status}
            errorMessage={tallyZone.error}
            onFile={handleTallyFile}
            onReupload={() => setTallyZone({ status: 'empty' })}
          />
        </div>
      </div>

      <ColumnMappingModal
        open={mappingModalOpen}
        fileInfo={tallyFileInfo}
        onConfirm={handleMappingConfirm}
        onCancel={handleMappingCancel}
      />
    </>
  )
}
