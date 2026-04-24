'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'
import type { TallyFileInfo } from '@/lib/parsers/tally-column-detect'

const REQUIRED_FIELDS: Array<{ key: keyof TallyColumnMap; label: string; required: boolean }> = [
  { key: 'supplierGstin', label: 'Supplier GSTIN', required: true },
  { key: 'supplierName',  label: 'Supplier Name',  required: false },
  { key: 'voucherNumber', label: 'Invoice Number', required: true },
  { key: 'voucherDate',   label: 'Invoice Date',   required: true },
  { key: 'taxableValue',  label: 'Taxable Value',  required: true },
  { key: 'igst',          label: 'IGST',           required: true },
  { key: 'cgst',          label: 'CGST',           required: true },
  { key: 'sgst',          label: 'SGST',           required: true },
  { key: 'totalAmount',   label: 'Total Amount',   required: true },
  { key: 'hsnCode',       label: 'HSN Code',       required: false },
]

const STORAGE_KEY = 'tally_column_map_template'

interface ColumnMappingModalProps {
  open: boolean
  fileInfo: TallyFileInfo | null
  onConfirm: (map: TallyColumnMap) => void
  onCancel: () => void
}

export function ColumnMappingModal({ open, fileInfo, onConfirm, onCancel }: ColumnMappingModalProps) {
  const [mapping, setMapping] = useState<Partial<TallyColumnMap>>({})
  const [saveTemplate, setSaveTemplate] = useState(true)

  useEffect(() => {
    if (!open || !fileInfo) return
    const saved = localStorage.getItem(STORAGE_KEY)
    const template: Partial<TallyColumnMap> = saved ? (JSON.parse(saved) as Partial<TallyColumnMap>) : {}
    const initial = fileInfo.detectedMap ?? template
    setMapping(initial as Partial<TallyColumnMap>)
  }, [open, fileInfo])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    },
    [onCancel],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open || !fileInfo) return null

  const { headers } = fileInfo

  function handleConfirm() {
    const complete = mapping as TallyColumnMap
    if (saveTemplate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(complete))
    }
    onConfirm(complete)
  }

  const allRequiredMapped = REQUIRED_FIELDS
    .filter(f => f.required)
    .every(f => !!mapping[f.key])

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="col-map-title"
    >
      {/* Panel */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-200">
          <h2 id="col-map-title" className="text-base font-semibold text-gray-900">
            Map your Tally columns
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {headers.length} columns detected. Match each required field to a column in your file.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
            {/* Table header */}
            <div className="grid grid-cols-[200px_1fr_180px] bg-gray-100 px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px] border-b border-gray-200">
              <span>Required field</span>
              <span>Sample values</span>
              <span>Your column</span>
            </div>

            {REQUIRED_FIELDS.map(field => {
              const currentVal = mapping[field.key] ?? ''
              const isMatched = !!currentVal
              const samples = currentVal ? (fileInfo.samples[currentVal] ?? []) : []

              return (
                <div
                  key={field.key}
                  className={cn(
                    'grid grid-cols-[200px_1fr_180px] items-center px-4 py-2.5 border-b border-gray-100 last:border-b-0',
                    !isMatched && field.required && 'bg-amber-50',
                  )}
                >
                  {/* Field label */}
                  <span className="font-semibold text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </span>

                  {/* Sample values */}
                  <span className="text-gray-400 font-mono truncate pr-4">
                    {samples.length > 0 ? samples.join(', ') : '—'}
                  </span>

                  {/* Mapped indicator or select */}
                  {isMatched ? (
                    <div className="flex items-center gap-1.5 border border-emerald-400 rounded px-2 py-1 bg-emerald-50 text-emerald-700">
                      <span aria-hidden="true">&#10003;</span>
                      <span className="truncate">{currentVal}</span>
                      <button
                        type="button"
                        onClick={() => setMapping(m => ({ ...m, [field.key]: '' }))}
                        className="ml-auto text-emerald-500 hover:text-emerald-700 shrink-0"
                        aria-label={`Clear mapping for ${field.label}`}
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <select
                      value=""
                      onChange={e => {
                        const v = e.target.value
                        if (v) setMapping(m => ({ ...m, [field.key]: v }))
                      }}
                      className="h-7 w-full rounded border border-amber-400 bg-amber-50 px-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      aria-label={`Select column for ${field.label}`}
                    >
                      <option value="">— Select —</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveTemplate}
              onChange={e => setSaveTemplate(e.target.checked)}
              className="accent-indigo-600"
            />
            Save as template for future uploads
          </label>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!allRequiredMapped}
              onClick={handleConfirm}
            >
              Confirm mapping
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
