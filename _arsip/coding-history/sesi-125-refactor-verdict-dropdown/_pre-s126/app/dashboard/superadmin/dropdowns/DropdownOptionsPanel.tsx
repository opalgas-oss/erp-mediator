'use client'

// app/dashboard/superadmin/dropdowns/DropdownOptionsPanel.tsx
// SNAPSHOT PRE-S#127 (pre-L3.4) — kondisi post-S#125 Layer 2 refactor
// Dibuat S#115. REFACTOR S#125: konsumsi verdict layer + safety map dari parent.

import type { JSX }       from 'react'
import { useState, useTransition } from 'react'
import { toast }          from 'sonner'
import type {
  MasterDropdownOption,
  GrupDenganOpsi,
  BuatOpsiPayload,
  UbahOpsiPayload,
} from '@/lib/types/master-dropdown.types'
import type { SafetyStatusFullMap } from '@/lib/types/usage-tracking.types'
import { useDeleteConfirmDialog }   from '@/lib/hooks/useDeleteWithSafetyCheck'
import { ICON_ACTION } from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }  from '@/lib/constants/ui-tokens.constant'
import {
  AddOptionDialog,  type AddOptionState,
  EditOptionDialog, type EditOptionState,
} from './DropdownOptionDialogs'
import { DeleteConfirmDialog } from './DropdownGroupDialogs'
import { DropdownOptionsList } from './DropdownOptionsList'
import { Button } from '@/components/ui/button'

const ADD_INIT: AddOptionState = {
  open: false, slug: '', label: '', stringValue: '',
  numericValue: '', sortOrder: '0', saving: false, error: '',
}
const EDIT_INIT: EditOptionState = {
  open: false, opsiId: null, opsiLabel: '', label: '', stringValue: '',
  numericValue: '', sortOrder: '0', saving: false, error: '',
}

interface Props {
  grup:             GrupDenganOpsi
  onDataChanged:    () => void
  safetyMap:        SafetyStatusFullMap
  safetyMapLoading: boolean
}

export function DropdownOptionsPanel({
  grup, onDataChanged, safetyMap, safetyMapLoading,
}: Props): JSX.Element {

  const [opsiList, setOpsiList] = useState<MasterDropdownOption[]>(grup.opsi)
  const [add,      setAdd     ] = useState<AddOptionState>(ADD_INIT)
  const [edit,     setEdit    ] = useState<EditOptionState>(EDIT_INIT)
  const [, startTransition] = useTransition()

  const {
    openDialog:    openOptionDeleteDialog,
    dialogState:   deleteDialogState,
    confirmDelete: confirmOptionDelete,
    cancelDelete:  cancelOptionDelete,
  } = useDeleteConfirmDialog({
    getDeleteUrl:  (id) => `/api/superadmin/dropdowns/options/${id}`,
    getDeleteInit: () => ({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    }),
    confirmTitle: (name) => `Nonaktifkan opsi "${name}"?`,
    confirmDesc:  'Opsi ini disembunyikan dari pilihan baru. Data lama tetap aman.',
    onDeleted:    () => refresh(),
  })

  function handleOptionDeleteClick(opsi: MasterDropdownOption) {
    openOptionDeleteDialog({ id: opsi.id, displayName: opsi.label })
  }

  async function fetchOpsi() {
    const res = await fetch(`/api/superadmin/dropdowns/groups/${grup.id}`)
    if (!res.ok) return
    const json = await res.json() as { data: GrupDenganOpsi }
    setOpsiList(json.data.opsi)
  }

  function refresh() {
    startTransition(() => { fetchOpsi().then(() => onDataChanged()) })
  }

  async function handleAdd() {
    setAdd(s => ({ ...s, saving: true, error: '' }))
    try {
      const payload: BuatOpsiPayload = {
        group_id:      grup.id,
        slug:          add.slug.trim(),
        label:         add.label.trim(),
        string_value:  add.stringValue.trim() || null,
        numeric_value: add.numericValue !== '' ? Number(add.numericValue) : null,
        json_value:    null,
        is_default:    false,
        is_system:     false,
        tenant_id:     null,
        sort_order:    Number(add.sortOrder),
      }
      const res  = await fetch('/api/superadmin/dropdowns/options', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { success: boolean; message?: string }
      if (!json.success) throw new Error(json.message ?? 'Gagal menyimpan')
      toast.success('Opsi berhasil ditambahkan')
      setAdd(ADD_INIT)
      refresh()
    } catch (err) {
      setAdd(s => ({ ...s, saving: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan' }))
    }
  }

  function openEdit(opsi: MasterDropdownOption) {
    setEdit({
      open: true, opsiId: opsi.id, opsiLabel: opsi.label,
      label:        opsi.label,
      stringValue:  opsi.string_value  ?? '',
      numericValue: opsi.numeric_value !== null ? String(opsi.numeric_value) : '',
      sortOrder:    String(opsi.sort_order),
      saving: false, error: '',
    })
  }

  async function handleEdit() {
    if (!edit.opsiId) return
    setEdit(s => ({ ...s, saving: true, error: '' }))
    try {
      const payload: UbahOpsiPayload = {
        label:         edit.label.trim(),
        string_value:  edit.stringValue.trim() || null,
        numeric_value: edit.numericValue !== '' ? Number(edit.numericValue) : null,
        sort_order:    Number(edit.sortOrder),
      }
      const res  = await fetch(`/api/superadmin/dropdowns/options/${edit.opsiId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { success: boolean; message?: string }
      if (!json.success) throw new Error(json.message ?? 'Gagal menyimpan')
      toast.success('Opsi berhasil diupdate')
      setEdit(EDIT_INIT)
      refresh()
    } catch (err) {
      setEdit(s => ({ ...s, saving: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan' }))
    }
  }

  async function handleSetDefault(opsiId: string) {
    try {
      const res  = await fetch(`/api/superadmin/dropdowns/groups/${grup.id}/set-default`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: opsiId }),
      })
      const json = await res.json() as { success: boolean; message?: string }
      if (!json.success) throw new Error(json.message ?? 'Gagal set default')
      toast.success('Default opsi berhasil diubah')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    }
  }

  async function handleDeactivate(opsi: MasterDropdownOption) {
    try {
      const res  = await fetch(`/api/superadmin/dropdowns/options/${opsi.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false } satisfies UbahOpsiPayload),
      })
      const json = await res.json() as { success: boolean; message?: string }
      if (!json.success) throw new Error(json.message ?? 'Gagal nonaktifkan')
      toast.success(`Opsi "${opsi.label}" dinonaktifkan`)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    }
  }

  const IconPlus = ICON_ACTION.add

  return (
    <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className={TYPOGRAPHY.label}>
          Opsi ({opsiList.filter(o => o.is_active).length} aktif)
        </span>
        {!grup.is_system && (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
            onClick={() => setAdd(s => ({ ...s, open: true }))}>
            <IconPlus size={12} />
            Tambah Opsi
          </Button>
        )}
      </div>

      <DropdownOptionsList
        grup={grup}
        opsiList={opsiList}
        onSetDefault={handleSetDefault}
        onEdit={openEdit}
        onDeactivate={handleDeactivate}
        onDeleteClick={handleOptionDeleteClick}
        safetyMap={safetyMap}
        safetyMapLoading={safetyMapLoading}
      />

      <AddOptionDialog
        state={add} grupName={grup.display_name}
        onStateChange={setAdd} onSave={handleAdd}
      />
      <EditOptionDialog
        state={edit} onStateChange={setEdit} onSave={handleEdit}
      />
      <DeleteConfirmDialog
        {...deleteDialogState}
        onConfirm={confirmOptionDelete}
        onCancel={cancelOptionDelete}
      />
    </div>
  )
}
