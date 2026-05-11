'use client'

// components/dropdowns/DeleteActionButton.tsx
// Komponen pure: render tombol Hapus dengan state berdasarkan verdict.
//
// PRINSIP: tombol TIDAK pernah compute verdict sendiri.
//   verdict.action === 'delete'   → tombol MERAH clickable
//   verdict.action === 'disabled' → tombol GREY, tidak clickable, tooltip jelaskan alasan
//
// Tooltip selalu tampil — termasuk saat enabled (memberi tahu "Hapus" / "Aman dihapus").
// Saat disabled, tooltip menampilkan title + remediation (jika ada).
//
// PROP `loading`: tampilkan spinner + disabled saat parent masih fetch safetyMap.
//   Tanpa ini, button bisa flash MERAH dulu (verdict default 'safe' saat map kosong)
//   sebelum settle ke verdict yang benar.
//
// Dibuat: Sesi #125 — Layer 2 View Components Refactor

import type { JSX } from 'react'
import { Button }   from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ICON_ACTION, ICON_STATUS } from '@/lib/constants/icons.constant'
import type { OptionVerdict, GroupVerdict } from '@/lib/dropdowns/verdict'

interface Props {
  verdict:    OptionVerdict | GroupVerdict
  onClick:    () => void
  size?:      'sm' | 'md'
  loading?:   boolean
  className?: string
}

export function DeleteActionButton({
  verdict, onClick, size = 'md', loading = false, className = '',
}: Props): JSX.Element {

  const IDel  = ICON_ACTION.delete
  const ILoad = ICON_STATUS.loading

  // Ukuran responsif — sm untuk dalam list opsi (h-6), md untuk dalam tabel grup (h-7)
  const sizeClass = size === 'sm' ? 'h-6 px-1.5' : 'h-7 w-7 p-0'
  const iconSize  = size === 'sm' ? 12 : 13

  // Loading state: override jadi disabled + spinner — parent masih fetch safetyMap
  if (loading) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex">
              <Button
                size="sm"
                variant="ghost"
                disabled
                aria-disabled
                className={`${sizeClass} text-slate-300 cursor-wait ${className}`}
              >
                <ILoad size={iconSize} className="animate-spin" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs font-medium">Memeriksa status pemakaian...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const isDisabled = verdict.action === 'disabled'

  // Warna: GREY saat disabled, MERAH saat enabled
  const colorClass = isDisabled
    ? 'text-slate-300 cursor-not-allowed'
    : 'text-red-400 hover:text-red-600'

  // Remediation text (jika ada di verdict)
  const remediation = 'remediation' in verdict ? verdict.remediation : undefined

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Span wrapper supaya tooltip tetap muncul saat button disabled */}
          <span tabIndex={isDisabled ? 0 : -1} className="inline-flex">
            <Button
              size="sm"
              variant="ghost"
              disabled={isDisabled}
              aria-disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation()
                if (!isDisabled) onClick()
              }}
              className={`${sizeClass} ${colorClass} ${className}`}
            >
              <IDel size={iconSize} />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs font-medium">{verdict.title}</p>
          {remediation && (
            <p className="text-xs mt-1 opacity-90 max-w-xs">{remediation}</p>
          )}
          {!remediation && !isDisabled && (
            <p className="text-xs mt-1 opacity-90">{verdict.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
