'use client'

// app/dashboard/superadmin/dropdowns/DropdownOptionsList.tsx
// SNAPSHOT PRE-S#127 (pre-L3.4) — dibuat oleh S#127 sebelum refactor kebab menu opsi
// Kondisi: post-S#125 Layer 2 refactor, sebelum L3.4 wire drawer opsi

import { useState, type JSX }                       from 'react'
import type { MasterDropdownOption, GrupDenganOpsi } from '@/lib/types/master-dropdown.types'
import type { SafetyStatusFullMap }                  from '@/lib/types/usage-tracking.types'
import { useDeletePermission }                       from '@/lib/hooks/useDeletePermission'
import { useSortableTable }                          from '@/lib/hooks/useSortableTable'
import { DeleteActionButton }                        from '@/components/dropdowns/DeleteActionButton'
import UsageTrackingPanel                            from '@/components/superadmin/UsageTrackingPanel'
import { ICON_ACTION, ICON_STATUS }                  from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }                                from '@/lib/constants/ui-tokens.constant'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'

interface Props {
  grup:             GrupDenganOpsi
  opsiList:         MasterDropdownOption[]
  onSetDefault:     (id: string) => void
  onEdit:           (opsi: MasterDropdownOption) => void
  onDeactivate:     (opsi: MasterDropdownOption) => void
  onDeleteClick:    (opsi: MasterDropdownOption) => void
  safetyMap:        SafetyStatusFullMap
  safetyMapLoading: boolean
}

export function DropdownOptionsList({
  grup, opsiList,
  onSetDefault, onEdit, onDeactivate, onDeleteClick,
  safetyMap, safetyMapLoading,
}: Props): JSX.Element {

  const { sorted, handleSort, sortIcon, sortIconClass } = useSortableTable(opsiList, 'label', 'asc')
  const [openUsagePanelId, setOpenUsagePanelId] = useState<string | null>(null)

  if (opsiList.length === 0) {
    return <p className={TYPOGRAPHY.muted}>Belum ada opsi.</p>
  }

  return (
    <div className="space-y-1">
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
          isUsageOpen={openUsagePanelId === opsi.id}
          onToggleUsage={() => setOpenUsagePanelId(p => p === opsi.id ? null : opsi.id)}
          onCloseUsage={() => setOpenUsagePanelId(null)}
          onSetDefault={onSetDefault}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onDeleteClick={onDeleteClick}
        />
      ))}
    </div>
  )
}

interface OptionRowProps {
  opsi:             MasterDropdownOption
  grup:             GrupDenganOpsi
  safetyMap:        SafetyStatusFullMap
  safetyMapLoading: boolean
  isUsageOpen:      boolean
  onToggleUsage:    () => void
  onCloseUsage:     () => void
  onSetDefault:     (id: string) => void
  onEdit:           (opsi: MasterDropdownOption) => void
  onDeactivate:     (opsi: MasterDropdownOption) => void
  onDeleteClick:    (opsi: MasterDropdownOption) => void
}

function OptionRow({
  opsi, grup, safetyMap, safetyMapLoading,
  isUsageOpen, onToggleUsage, onCloseUsage,
  onSetDefault, onEdit, onDeactivate, onDeleteClick,
}: OptionRowProps): JSX.Element {

  const optionVerdict = useDeletePermission({
    type:   'option',
    option: opsi,
    group:  grup,
    safetyMap,
  })

  const IEdit  = ICON_ACTION.edit
  const ICheck = ICON_ACTION.confirm
  const IWarn  = ICON_STATUS.warning
  const IInfo  = ICON_STATUS.info

  return (
    <div>
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
        opsi.is_active ? 'bg-white border border-slate-200' : 'bg-slate-100 opacity-60'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          {opsi.is_default && <Badge variant="secondary" className="shrink-0 text-xs h-5">Default</Badge>}
          {opsi.is_system  && <Badge variant="outline"   className="shrink-0 text-xs h-5">Sistem</Badge>}
          <span className="font-medium truncate">{opsi.label}</span>
          <span className="text-slate-400 shrink-0 text-xs font-mono">({opsi.slug})</span>
          {opsi.string_value && <span className="text-slate-500 text-xs shrink-0">= {opsi.string_value}</span>}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {!opsi.is_default && opsi.is_active && !opsi.is_system && (
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-slate-500"
              title="Set sebagai default" onClick={() => onSetDefault(opsi.id)}>
              <ICheck size={12} />
            </Button>
          )}
          <Button size="sm" variant="ghost" title="Pemetaan Pemakaian"
            className={`h-6 px-1.5 ${isUsageOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-300 hover:text-slate-500'}`}
            onClick={onToggleUsage}>
            <IInfo size={12} />
          </Button>
          {opsi.is_active && !opsi.is_system && (
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs"
              onClick={() => onEdit(opsi)}>
              <IEdit size={12} />
            </Button>
          )}
          {opsi.is_active && !opsi.is_system && !opsi.is_default && (
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-amber-500"
              title="Nonaktifkan" onClick={() => onDeactivate(opsi)}>
              <IWarn size={12} />
            </Button>
          )}
          {!opsi.is_system && (
            <DeleteActionButton
              verdict={optionVerdict}
              onClick={() => onDeleteClick(opsi)}
              size="sm"
              loading={safetyMapLoading}
            />
          )}
        </div>
      </div>

      {isUsageOpen && (
        <div className="mt-1 px-3 py-2 bg-blue-50/30 rounded-lg border border-blue-100">
          <UsageTrackingPanel
            sourceTable="master_dropdown_options"
            sourceId={opsi.id}
            isOpen={true}
            onClose={onCloseUsage}
            itemLabel={opsi.label}
          />
        </div>
      )}
    </div>
  )
}
