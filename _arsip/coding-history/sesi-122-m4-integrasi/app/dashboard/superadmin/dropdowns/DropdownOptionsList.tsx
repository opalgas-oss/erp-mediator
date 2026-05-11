'use client'

// app/dashboard/superadmin/dropdowns/DropdownOptionsList.tsx
// List render opsi dalam grup — presentational, menerima handlers dari DropdownOptionsPanel.
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.6

import type { JSX }         from 'react'
import type { MasterDropdownOption } from '@/lib/types/master-dropdown.types'
import { ICON_ACTION, ICON_STATUS }  from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }                from '@/lib/constants/ui-tokens.constant'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'

interface Props {
  opsiList:       MasterDropdownOption[]
  onSetDefault:   (id: string) => void
  onEdit:         (opsi: MasterDropdownOption) => void
  onDeactivate:   (opsi: MasterDropdownOption) => void
}

export function DropdownOptionsList({ opsiList, onSetDefault, onEdit, onDeactivate }: Props): JSX.Element {
  const IconEdit  = ICON_ACTION.edit
  const IconCheck = ICON_ACTION.confirm
  const IconWarn  = ICON_STATUS.warning

  if (opsiList.length === 0) {
    return <p className={TYPOGRAPHY.muted}>Belum ada opsi.</p>
  }

  return (
    <div className="space-y-1">
      {opsiList.map(opsi => (
        <div
          key={opsi.id}
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
            opsi.is_active ? 'bg-white border border-slate-200' : 'bg-slate-100 opacity-60'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {opsi.is_default && (
              <Badge variant="secondary" className="shrink-0 text-xs h-5">Default</Badge>
            )}
            {opsi.is_system && (
              <Badge variant="outline" className="shrink-0 text-xs h-5">Sistem</Badge>
            )}
            <span className="font-medium truncate">{opsi.label}</span>
            <span className="text-slate-400 shrink-0 text-xs font-mono">({opsi.slug})</span>
            {opsi.string_value && (
              <span className="text-slate-500 text-xs shrink-0">= {opsi.string_value}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {!opsi.is_default && opsi.is_active && !opsi.is_system && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-slate-500"
                title="Set sebagai default" onClick={() => onSetDefault(opsi.id)}>
                <IconCheck size={12} />
              </Button>
            )}
            {opsi.is_active && !opsi.is_system && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                onClick={() => onEdit(opsi)}>
                <IconEdit size={12} />
              </Button>
            )}
            {opsi.is_active && !opsi.is_system && !opsi.is_default && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive"
                title="Nonaktifkan opsi" onClick={() => onDeactivate(opsi)}>
                <IconWarn size={12} />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
