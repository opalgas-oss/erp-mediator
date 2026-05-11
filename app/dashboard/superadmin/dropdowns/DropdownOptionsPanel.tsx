'use client'

// app/dashboard/superadmin/dropdowns/DropdownOptionsPanel.tsx
// Panel opsi dalam satu grup — list opsi + handlers (tambah/edit/set-default/nonaktifkan).
// Dialog dipecah ke DropdownOptionDialogs.tsx (ATURAN 9).
//
// PERAN SETELAH S#125 REFACTOR:
//   - Terima safetyMap dari parent (DropdownGroupsTable → dari DropdownGroupsClient)
//   - Pass safetyMap + loading ke DropdownOptionsList (verdict dihitung di OptionRow)
//   - Pakai useDeleteConfirmDialog (hook tipis tanpa fetch verdict)
//
// HAPUS DI S#125:
//   - useEffect prefetchVerdicts (verdict sudah di parent's bulk fetch)
//   - useDeleteWithSafetyCheck dengan cache verdict
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.6
// REFACTOR S#125: konsumsi verdict layer + safety map dari parent.

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
import type { DrawerTarget } from '@/components/dropdowns/DropdownDetailDrawer'
import {
  AddOptionDialog,  type AddOptionState,
  EditOptionDialog, type EditOptionState,
} from './DropdownOptionDialogs'
import { DeleteConfirmDialog } from './DropdownGroupDialogs'
import { DropdownOptionsList } from './DropdownOptionsList'

import { Button } from '@/components/ui/button'

// ─── State defaults ──────────────────────────────────────────────────────────

const ADD_INIT: AddOptionState = {
  open: false, slug: '', label: '', stringValue: '',
  numericValue: '', sortOrder: '0', saving: false, error: '',
}

const EDIT_INIT: EditOptionState = {
  open: false, opsiId: null, opsiLabel: '', label: '', stringValue: '',
  numericValue: '', sortOrder: '0', saving: false, error: '',
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  grup:             GrupDenganOpsi
  onDataChanged:    () => void
  safetyMap:        SafetyStatusFullMap
  safetyMapLoading: boolean
  /** Callback buka side peek drawer — di-pass ke DropdownOptionsList → OptionRow */
  onOpenDrawer:     (target: DrawerTarget) => void
}

// ─── Komponen ────────────────────────────────────────────────────────────────

export function DropdownOptionsPanel({
  grup, onDataChanged, safetyMap, safetyMapLoading, onOpenDrawer,
}: Props): JSX.Element {

  const [opsiList, setOpsiList] = useState<MasterDropdownOption[]>(grup.opsi)
  const [add,      setAdd     ] = useState<AddOptionState>(ADD_INIT)
  const [edit,     setEdit    ] = useState<EditOptionState>(EDIT_INIT)
  const [, startTransition] = useTransition()

  // CATATAN: opsiList di-init dari grup.opsi saat mount.
  // Panel ini hanya tampil saat grup expanded (mount/unmount per expand toggle),
  // jadi setiap kali user buka grup baru, useState initializer fresh dengan grup.opsi.
  // Refresh data dilakukan via fetchOpsi() lokal saat add/edit/setDefault/deactivate.

  // ── Dialog konfirmasi delete opsi (hook tipis, tanpa fetch verdict) ──────
  // CATATAN: delete opsi sebenarnya = nonaktifkan (PATCH is_active=false), bukan hard delete.
  // Ini preserve behavior existing dari S#122 — opsi tidak pernah di-hard-delete
  // karena referensi mungkin masih ada di data lain.

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
    // DropdownOptionsList sudah filter via verdict.action — kalau sampai handler ini,
    // berarti verdict === 'safe' (action === 'delete'). Aman langsung buka dialog.
    openOptionDeleteDialog({ id: opsi.id, displayName: opsi.label })
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function fetchOpsi() {
    const res = await fetch(`/api/superadmin/dropdowns/groups/${grup.id}`)
    if (!res.ok) return
    const json = await res.json() as { data: GrupDenganOpsi }
    setOpsiList(json.data.opsi)
  }

  function refresh() {
    startTransition(() => { fetchOpsi().then(() => onDataChanged()) })
  }

  // ── Tambah opsi ───────────────────────────────────────────────────────────

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

  // ── Edit opsi ─────────────────────────────────────────────────────────────

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

  // ── Set default ───────────────────────────────────────────────────────────

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

  // ── Nonaktifkan opsi (tombol amber kuning) ─────────────────────────────────
  // Berbeda dengan delete dialog — ini tidak butuh konfirmasi, langsung patch.

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

  // ─── Render ───────────────────────────────────────────────────────────────

  const IconPlus = ICON_ACTION.add

  return (
    <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-3">

      {/* Header row */}
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

      {/* List opsi — pass grup + safetyMap supaya OptionRow bisa hitung verdict */}
      <DropdownOptionsList
        grup={grup}
        opsiList={opsiList}
        onSetDefault={handleSetDefault}
        onEdit={openEdit}
        onDeactivate={handleDeactivate}
        onDeleteClick={handleOptionDeleteClick}
        safetyMap={safetyMap}
        safetyMapLoading={safetyMapLoading}
        onOpenDrawer={onOpenDrawer}
      />

      {/* Dialogs */}
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
