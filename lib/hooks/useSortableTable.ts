// lib/hooks/useSortableTable.ts
// Hook generic untuk sorting kolom tabel — reusable di semua halaman listing.
//
// Dibuat: Sesi #106 — SORT-MSG-TABLE
// Dipakai pertama: MessageLibraryClient.tsx
//
// Cara pakai:
//   const { sorted, sortIcon, handleSort } = useSortableTable(filtered, 'kategori', 'asc')
//
// Icon di header (render di komponen .tsx):
//   <TableHead onClick={() => handleSort('key')}>
//     Key <span className={sortIconClass('key')}>{sortIcon('key')}</span>
//   </TableHead>

import { useState, useMemo } from 'react'

type SortDir = 'asc' | 'desc'

// Field yang dianggap sebagai tanggal — di-sort numerik
const DATE_FIELDS = ['updated_at', 'created_at'] as const
type DateField = typeof DATE_FIELDS[number]

function isDateField(col: string): col is DateField {
  return (DATE_FIELDS as readonly string[]).includes(col)
}

interface UseSortableTableResult<T extends object> {
  sorted:        T[]
  sortCol:       keyof T
  sortDir:       SortDir
  handleSort:    (col: keyof T) => void
  sortIcon:      (col: keyof T) => string
  sortIconClass: (col: keyof T) => string
}

export function useSortableTable<T extends object>(
  data:       T[],
  defaultCol: keyof T,
  defaultDir: SortDir = 'asc',
): UseSortableTableResult<T> {
  const [sortCol, setSortCol] = useState<keyof T>(defaultCol)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  function handleSort(col: keyof T) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // Kembalikan karakter icon — rendering di komponen .tsx
  function sortIcon(col: keyof T): string {
    if (sortCol !== col) return '⇅'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  // Kembalikan class icon — aktif (gelap) atau tidak aktif (abu)
  function sortIconClass(col: keyof T): string {
    return sortCol === col
      ? 'ml-1 text-slate-700 select-none'
      : 'ml-1 text-slate-400 select-none'
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const colKey = sortCol as string
      const aVal   = (a as Record<string, unknown>)[sortCol as string]
      const bVal   = (b as Record<string, unknown>)[sortCol as string]
      const dir    = sortDir === 'asc' ? 1 : -1

      // Sort tanggal — numerik
      if (isDateField(colKey)) {
        const aTime = aVal ? new Date(aVal as string).getTime() : 0
        const bTime = bVal ? new Date(bVal as string).getTime() : 0
        return (aTime - bTime) * dir
      }

      // Sort string — localeCompare bahasa Indonesia
      const aStr = String(aVal ?? '').toLowerCase()
      const bStr = String(bVal ?? '').toLowerCase()
      const cmp  = aStr.localeCompare(bStr, 'id')
      if (cmp !== 0) return cmp * dir

      // Tie-breaker: 'key' ASC selalu (jika field key ada)
      if ('key' in a && 'key' in b && sortCol !== 'key') {
        const aKey = String((a as Record<string, unknown>)['key'] ?? '').toLowerCase()
        const bKey = String((b as Record<string, unknown>)['key'] ?? '').toLowerCase()
        return aKey.localeCompare(bKey, 'id')
      }

      return 0
    })
  }, [data, sortCol, sortDir])

  return { sorted, sortCol, sortDir, handleSort, sortIcon, sortIconClass }
}
