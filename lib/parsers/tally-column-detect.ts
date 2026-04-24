'use client'

import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { detectColumnMap } from '@/lib/parsers/tally-excel-parser'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'

export interface TallyFileInfo {
  headers: string[]
  samples: Record<string, string[]>   // header → first 3 non-empty values
  detectedMap: TallyColumnMap | null  // null = auto-detect failed, show modal
}

export async function extractTallyFileInfo(file: File): Promise<TallyFileInfo> {
  const isCsv = file.name.endsWith('.csv')
  let headers: string[] = []
  let allRows: Record<string, string>[] = []

  if (isCsv) {
    const text = await file.text()
    const { data } = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
    })
    headers = Object.keys(data[0] ?? {})
    allRows = data
  } else {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array', sheetRows: 6 })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
    headers = Object.keys(data[0] ?? {})
    allRows = data
  }

  const samples: Record<string, string[]> = {}
  for (const h of headers) {
    samples[h] = allRows
      .map(r => String(r[h] ?? '').trim())
      .filter(Boolean)
      .slice(0, 3)
  }

  return { headers, samples, detectedMap: detectColumnMap(headers) }
}
