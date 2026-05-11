'use client'

// app/dashboard/superadmin/dropdowns/DropdownOptionsList.tsx
// List render opsi dalam grup — sort + kebab menu aksi + tombol Hapus safety check.
//
// PERAN SETELAH S#127 REFACTOR (L3.4):
//   - Setiap opsi punya kebab menu (⋮) di kanan
//   - "Lihat Pemetaan" di kebab → trigger onOpenDrawer (side peek drawer)
//   - Inline UsageTrackingPanel accordion DIHAPUS (sama seperti grup di L3.3)
//   - Verdict layer tetap via useDeletePermission
//
// HAPUS DI S#127:
//   - openUsagePanelId state + inline UsageTrackingPanel accordion
//   - Tombol ⓘ / ✏️ / ⚠️ berjajar di baris opsi
//
// Dibuat S#115. Update S#122. REFACTOR S#125: konsumsi verdict layer.
// REFACTOR S#127 (L3.4): kebab menu + side peek drawer (hapus inline panel).

import { type JSX }                              from 'react'
import type { MasterDropdownOption, GrupDenganOpsi } from '@/lib/types/master-dropdown.types'
import type { SafetyStatusFullMap }                  from '@/lib/types/usage-tracking.types'
import { useDeletePermission }                       from '@/lib/hooks/useDeletePermission'
import { useSortableTable }                          from '@/lib/hooks/useSortableTable'
import type { DrawerTarget }                         from '@/components/dropdowns/DropdownDetailDrawer'
import { ICON_ACTION }                               from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }                                from '@/lib/constants/ui-tokens.constant'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  grup:             GrupDenganOpsi
  opsiList:         MasterDropdownOption[]
  onSetDefault:     (id: string) => void
  onEdit:           (opsi: MasterDropdownOption) => void
  onDeactivate:     (opsi: MasterDropdownOption) => void
  onDeleteClick:    (opsi: MasterDropdownOption) => void
  onOpenDrawer:     (target: DrawerTarget) => void
  safetyMap:        SafetyStatusFullMap
  safetyMapLoading: boolean
}

// ─── Komponen utama ──────────────────────────────────────────────────────────

export function DropdownOptionsList({
  grup, opsiList,
  onSetDefault, onEdit, onDeactivate, onDeleteClick, onOpenDrawer,
  safetyMap, safetyMapLoading,
}: Props): JSX.Element {

  const { sorted, handleSort, sortIcon, sortIconClass } = useSortableTable(opsiList, 'label', 'asc')

  if (opsiList.length === 0) {
    return <p className={TYPOGRAPHY.muted}>Belum ada opsi.</p>
  }

  return (
    <div className="space-y-1">
      {/* Sort header — kompak, di atas list */}
      <div className="flex items-center gap-2 pb-1 text-xs text-slate-400">
        <span className="cursor-pointer hover:text-slate-600 select-none"
          onClick={() => handleSort('label')}>
          Label <span className={sortIconClass('label')}>{sortIcon('label')}</span>
        </span>
        <span className="text-slate-200">|</span>
        <span className="cursor-pointer hover:text-slate-600 select-none"
          onClick={() => handleSort('slug')}>
          Slug <span className={sortIconClass('slug')}>{sortIcon('slug')}</span>
        </span>
        <span className="text-slate-200">|</span>
        <span className="cursor-pointer hover:text-slate-600 select-none"
          onClick={() => handleSort('sort_order')}>
          Urutan <span className={sortIconClass('sort_order')}>{sortIcon('sort_order')}</span>
        </span>
      </div>

      {sorted.map(opsi => (
        <OptionRow
          key={opsi.id}
          opsi={opsi}
          grup={grup}
          safetyMap={safetyMap}
          safetyMapLoading={safetyMapLoading}
          onSetDefault={onSetDefault}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onDeleteClick={onDeleteClick}
          onOpenDrawer={onOpenDrawer}
        />
      ))}
    </div>
  )
}

// ─── Sub-komponen OptionRow ──────────────────────────────────────────────────
// Dipecah supaya bisa pakai useDeletePermission hook (hook hanya boleh di top-level).

interface OptionRowProps {
  opsi:             MasterDropdownOption
  grup:             GrupDenganOpsi
  safetyMap:        SafetyStatusFullMap
  safetyMapLoading: boolean
  onSetDefault:     (id: string) => void
  onEdit:           (opsi: MasterDropdownOption) => void
  onDeactivate:     (opsi: MasterDropdownOption) => void
  onDeleteClick:    (opsi: MasterDropdownOption) => void
  onOpenDrawer:     (target: DrawerTarget) => void
}

function OptionRow({
  opsi, grup, safetyMap, safetyMapLoading,
  onSetDefault, onEdit, onDeactivate, onDeleteClick, onOpenDrawer,
}: OptionRowProps): JSX.Element {

  // ── Hitung verdict opsi via hook (memoized) ───────────────────────────────
  const optionVerdict = useDeletePermission({
    type:   'option',
    option: opsi,
    group:  grup,
    safetyMap,
  })

  const IMore  = ICON_ACTION.more
  const ICheck = ICON_ACTION.confirm

  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
      opsi.is_active ? 'bg-white border border-slate-200' : 'bg-slate-100 opacity-60'
    }`}>
      {/* Info opsi — kiri */}
      <div className="flex items-center gap-2 min-w-0">
        {opsi.is_default && <Badge variant="secondary" className="shrink-0 text-xs h-5">Default</Badge>}
        {opsi.is_system  && <Badge variant="outline"   className="shrink-0 text-xs h-5">Sistem</Badge>}
        <span className="font-medium truncate">{opsi.label}</span>
        <span className="text-slate-400 shrink-0 text-xs font-mono">({opsi.slug})</span>
        {opsi.string_value && <span className="text-slate-500 text-xs shrink-0">= {opsi.string_value}</span>}
      </div>

      {/* Aksi — kanan: Set Default + kebab menu */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {/* Set Default — tetap standalone supaya mudah diakses */}
        {!opsi.is_default && opsi.is_active && !opsi.is_system && (
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-slate-500"
            title="Set sebagai default" onClick={() => onSetDefault(opsi.id)}>
            <ICheck size={12} />
          </Button>
        )}

        {/* Kebab menu opsi (⋮) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700">
              <IMore size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {/* Lihat Pemetaan — buka side peek drawer */}
            <DropdownMenuItem onClick={() => onOpenDrawer({
              sourceTable: 'master_dropdown_options',
              sourceId:    opsi.id,
              itemLabel:   opsi.label,
              verdict:     optionVerdict,
              isSystem:    opsi.is_system,
            })}>
              Lihat Pemetaan
            </DropdownMenuItem>

            {/* Edit */}
            {opsi.is_active && !opsi.is_system && (
              <DropdownMenuItem onClick={() => onEdit(opsi)}>
                Edit
              </DropdownMenuItem>
            )}

            {/* Nonaktifkan */}
            {opsi.is_active && !opsi.is_system && !opsi.is_default && (
              <DropdownMenuItem
                onClick={() => onDeactivate(opsi)}
                className="text-amber-600 focus:text-amber-600"
              >
                Nonaktifkan
              </DropdownMenuItem>
            )}

            {/* Hapus — disabled kalau verdict blocked */}
            {!opsi.is_system && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { if (optionVerdict.action !== 'disabled') onDeleteClick(opsi) }}
                  disabled={optionVerdict.action === 'disabled' || safetyMapLoading}
                  className="text-destructive focus:text-destructive"
                >
                  Hapus
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
