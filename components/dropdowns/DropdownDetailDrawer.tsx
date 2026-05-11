'use client'

// components/dropdowns/DropdownDetailDrawer.tsx
// Side Peek Drawer — tampilkan detail pemakaian + verdict satu item (grup atau opsi).
//
// URUTAN TAMPIL (S#127 koreksi Philips):
//   1. UsageTrackingPanel (Detail Pemakaian) — di atas
//   2. DeleteVerdictPanel (Verdict/warning) — di bawah
//
// Dibuat: Sesi #127 — L3.2. Koreksi UI: S#127 akhir.

import type { JSX }          from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
}                            from '@/components/ui/sheet'
import { DeleteVerdictPanel } from '@/components/dropdowns/DeleteVerdictPanel'
import UsageTrackingPanel    from '@/components/superadmin/UsageTrackingPanel'
import type { OptionVerdict, GroupVerdict } from '@/lib/dropdowns/verdict'

// ─── DrawerTarget — interface publik untuk buka drawer ───────────────────────

export interface DrawerTarget {
  sourceTable: 'master_dropdown_groups' | 'master_dropdown_options'
  sourceId:    string
  itemLabel:   string
  verdict:     OptionVerdict | GroupVerdict
  /** True jika item adalah komponen sistem inti — tidak bisa dihapus/dinonaktifkan */
  isSystem:    boolean
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  target:  DrawerTarget | null
  onClose: () => void
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function DropdownDetailDrawer({ target, onClose }: Props): JSX.Element {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:w-[400px] lg:w-[520px] overflow-y-auto flex flex-col gap-0 p-0">
        {target && (
          <>
            {/* Header: "Info" + nama item lebih besar & bold */}
            <SheetHeader className="px-6 py-5 border-b border-slate-100">
              <SheetTitle className="text-base font-semibold leading-tight">
                Info
                <span className="block text-lg font-bold text-slate-900 mt-1">
                  {target.itemLabel}
                </span>
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-6 py-5 flex-1">
              {/* Item sistem: hanya tampil card sistem, tanpa UsageTrackingPanel */}
              {target.isSystem ? (
                <div className="rounded-md border border-slate-300 bg-slate-50 p-4 text-slate-800">
                  <div className="flex items-start gap-2">
                    <span className="text-lg shrink-0">🔒</span>
                    <div>
                      <h4 className="font-medium">Item Sistem</h4>
                      <p className="mt-1 text-sm">
                        <span className="font-semibold">{target.itemLabel}</span> adalah komponen sistem inti platform.
                        Tidak dapat dihapus atau dinonaktifkan untuk menjaga integritas sistem.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Item biasa: detail pemakaian + verdict jika ada blocker */
                <>
                  <UsageTrackingPanel
                    sourceTable={target.sourceTable}
                    sourceId={target.sourceId}
                    isOpen={true}
                    onClose={onClose}
                    itemLabel={target.itemLabel}
                    hideVerdictHeader={true}
                    className="rounded-lg p-4"
                  />
                  {target.verdict.kind !== 'safe' && target.verdict.kind !== 'safe-empty' && (
                    <DeleteVerdictPanel verdict={target.verdict} />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
