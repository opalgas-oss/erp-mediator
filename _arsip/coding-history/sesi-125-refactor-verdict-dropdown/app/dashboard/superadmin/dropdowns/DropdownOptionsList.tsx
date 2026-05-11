'use client'

// app/dashboard/superadmin/dropdowns/DropdownOptionsList.tsx
// List render opsi dalam grup — sort + Pemetaan Pemakaian + tombol Hapus safety check.
// Delete state di DropdownOptionsPanel (via useDeleteWithSafetyCheck).
// Dibuat S#115. Update S#122: sort + UsageTrackingPanel per opsi + delete button.

import { useState, type JSX }               from 'react'
import type { MasterDropdownOption }          from '@/lib/types/master-dropdown.types'
import type { SafetyVerdict }                 from '@/lib/types/usage-tracking.types'
import { useSortableTable }                   from '@/lib/hooks/useSortableTable'
import UsageTrackingPanel                     from '@/components/superadmin/UsageTrackingPanel'
import { ICON_ACTION, ICON_STATUS }           from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }                         from '@/lib/constants/ui-tokens.constant'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'

interface Props {
  opsiList:       MasterDropdownOption[]
  onSetDefault:   (id: string) => void
  onEdit:         (opsi: MasterDropdownOption) => void
  onDeactivate:   (opsi: MasterDropdownOption) => void
  onDeleteClick:  (opsi: MasterDropdownOption) => void
  deleteVerdicts: Record<string, SafetyVerdict | 'loading'>
}

export function DropdownOptionsList({
  opsiList, onSetDefault, onEdit, onDeactivate, onDeleteClick, deleteVerdicts,
}: Props): JSX.Element {
  const { sorted, handleSort, sortIcon, sortIconClass } = useSortableTable(opsiList, 'label', 'asc')
  const [openUsagePanelId, setOpenUsagePanelId] = useState<string | null>(null)

  const IEdit  = ICON_ACTION.edit,   IDel  = ICON_ACTION.delete
  const ICheck = ICON_ACTION.confirm, IWarn = ICON_STATUS.warning
  const IInfo  = ICON_STATUS.info,   ILoad = ICON_STATUS.loading

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

      {sorted.map(opsi => {
        const isUsageOpen  = openUsagePanelId === opsi.id
        const delVerdict   = deleteVerdicts[opsi.id]
        const isDelLoading = delVerdict === 'loading'
        const isDelBlocked = delVerdict === 'TIDAK_AMAN' || delVerdict === 'TIDAK_BISA' || opsi.is_default

        return (
          <div key={opsi.id}>
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
                  onClick={() => setOpenUsagePanelId(p => p === opsi.id ? null : opsi.id)}>
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
                  <Button size="sm" variant="ghost" disabled={isDelBlocked}
                    className={`h-6 px-1.5 text-xs ${isDelBlocked ? 'text-slate-200 cursor-not-allowed' : 'text-red-400 hover:text-red-600'}`}
                    title={isDelLoading ? 'Memeriksa pemakaian...' :
                      opsi.is_default ? 'Tidak aman — ini default grup. Set default lain dulu sebelum hapus.' :
                      delVerdict === 'TIDAK_BISA' ? 'Tidak bisa — ada di kode modul aktif' :
                      delVerdict === 'TIDAK_AMAN' ? 'Tidak aman — dipakai modul lain' : 'Hapus opsi'}
                    onClick={() => onDeleteClick(opsi)}>
                    {isDelLoading ? <ILoad size={12} className="animate-spin" /> : <IDel size={12} />}
                  </Button>
                )}
              </div>
            </div>

            {isUsageOpen && (
              <div className="mt-1 px-3 py-2 bg-blue-50/30 rounded-lg border border-blue-100">
                <UsageTrackingPanel
                  sourceTable="master_dropdown_options"
                  sourceId={opsi.id}
                  isOpen={true}
                  onClose={() => setOpenUsagePanelId(null)}
                  itemLabel={opsi.label}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
