'use client'

import { useRef, useState, DragEvent } from 'react'
import { cn } from '@/lib/utils'

export type DropZoneStatus = 'empty' | 'dragging' | 'uploading' | 'done' | 'error'

interface FileDropZoneProps {
  type: 'ims' | 'tally'
  uploadedAt?: string | null        // ISO datetime string
  uploadedCount?: number
  status: DropZoneStatus
  errorMessage?: string | null
  onFile: (file: File) => void
  onReupload?: () => void
}

const ACCEPT: Record<'ims' | 'tally', string> = {
  ims:   '.json',
  tally: '.csv,.xls,.xlsx',
}

const LABELS: Record<'ims' | 'tally', { title: string; hint: string; icon: string }> = {
  ims:   { title: 'IMS JSON',       hint: 'Download from GSTN → IMS tab → Export JSON', icon: '📄' },
  tally: { title: 'Tally CSV/Excel', hint: 'Export purchase register from Tally',        icon: '📊' },
}

export function FileDropZone({ type, uploadedAt, uploadedCount, status, errorMessage, onFile, onReupload }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { title, hint, icon } = LABELS[type]

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  if (status === 'done' && uploadedAt) {
    const date = new Date(uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    return (
      <div className="flex items-center gap-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3">
        <span className="text-xl">✅</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-800">{title}</p>
          <p className="text-xs text-gray-500">{uploadedCount} rows · {date}</p>
        </div>
        {onReupload && (
          <button onClick={onReupload} className="text-xs text-emerald-600 hover:underline shrink-0">
            Re-upload
          </button>
        )}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-lg border-2 border-red-400 bg-red-50 p-3">
        <p className="text-xs font-semibold text-red-800 mb-1">{title} — upload failed</p>
        <p className="text-xs text-red-600">{errorMessage}</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-xs text-red-700 underline"
        >
          Try again
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT[type]} className="hidden" onChange={handleChange} />
      </div>
    )
  }

  if (status === 'uploading') {
    return (
      <div className="flex items-center gap-3 rounded-lg border-2 border-indigo-300 bg-indigo-50 p-3 animate-pulse">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-xs font-semibold text-indigo-800">{title}</p>
          <p className="text-xs text-indigo-500">Processing…</p>
        </div>
      </div>
    )
  }

  const isDragging = dragging || status === 'dragging'
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'cursor-pointer rounded-lg border-2 border-dashed p-3 text-center transition-colors',
        isDragging
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50',
        type === 'tally' && status === 'empty' && 'border-amber-300'
      )}
    >
      <span className="text-xl mb-1 block">{icon}</span>
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {isDragging ? 'Drop to upload' : 'Click or drop to upload'}
      </p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[type]}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
