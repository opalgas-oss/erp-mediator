'use client'

// app/dashboard/superadmin/dropdowns/DropdownGroupsClient.tsx
// Orchestrator Master Dropdown — state management + API handlers.
// UI tabel   → DropdownGroupsTable.tsx
// UI dialogs → DropdownGroupDialogs.tsx
// UI opsi    → DropdownOptionsPanel.tsx
// Delete safety check → useDeleteWithSafetyCheck (lib/hooks)
//
// Dibuat S#115. Update S#122: tambah delete via useGroupDeleteCheck hook.
// Update S#124: Refactor useEffect — ganti 50+ per-item sp_check_usage call
//   dengan 2 bulk fetch dari /api/superadmin/usage/safety-status (tabel cache).

import type { JSX }       from 'react'
import { useState, useTransition, useCallback, useEffect } from 'react'
import { toast }          from 'sonner'
import type {
  GrupDenganOpsi,
  BuatGrupPayload,
  UbahGrupPayload,
  DropdownCategory,
} from '@/lib/types/master-dropdown.types'
import type {
  SafetyVerdict,
  SafetyStatusResult,
} from '@/lib/types/usage-tracking.types'
import { useDeleteWithSafetyCheck } from '@/lib/hooks/useDeleteWithSafetyCheck'
import { ICON_ACTION }          from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }           from '@/lib/constants/ui-tokens.constant'
import {
  AddGroupDialog,   type AddGroupState,
  EditGroupDialog,  type EditGroupState,
  DeactivateGroupDialog,
  DeleteConfirmDialog,
} from './DropdownGroupDialogs'
import { DropdownGroupsTable }  from './DropdownGroupsTable'
import { Button }               from '@/components/ui/button'

// ─── State defaults ───────────────────────────────────────────────────────────

const ADD_INIT: AddGroupState = {
  open: false, slug: '', displayName: '', description: '',
  category: 'config_unit', module: '', canOverride: false,
  overrideMode: 'none', sortOrder: '0', saving: false, error: '',
}
const EDIT_INIT: EditGroupState = {
  open: false, grup: null, displayName: '', description: '',
  canOverride: false, overrideMode: 'none', sortOrder: '0', saving: false, error: '',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { initialData: GrupDenganOpsi[] }

// ─── Helper — verdict lookup dari bulk response ───────────────────────────────

function getVerdictFromBulk(itemId: string, data: SafetyStatusResult[]): SafetyVerdict {
  const specific   = data.find(r => r.source_id === itemId)
  if (specific) return specific.safety_verdict

  const tableLevel = data.find(r => r.source_id === null)
  if (tableLevel) return tableLevel.safety_verdict

  return 'AMAN'
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function DropdownGroupsClient({ initialData }: Props): JSX.Element {
  const [grupList,   setGrupList  ] = useState<GrupDenganOpsi[]>(initialData)
  const [activeTab,  setActiveTab ] = useState<DropdownCategory | 'semua'>('semua')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [add,        setAdd       ] = useState<AddGroupState>(ADD_INIT)
  const [edit,       setEdit      ] = useState<EditGroupState>(EDIT_INIT)
  const [deact,      setDeact     ] = useState<{ open: boolean; grup: GrupDenganOpsi | null; loading: boolean }>({
    open: false, grup: null, loading: false,
  })
  const [, startTransition] = useTransition()

  const filtered = activeTab === 'semua' ? grupList : grupList.filter(g => g.category === activeTab)

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/superadmin/dropdowns/groups')
    if (!res.ok) return
    const json = await res.json() as { data: GrupDenganOpsi[] }
    setGrupList(json.data)
  }, [])

  const handleDataChanged = useCallback(() => {
    startTransition(() => { fetchAll() })
  }, [fetchAll])

  const {
    deleteVerdicts, setVerdict,
    handleDeleteClick: _handleGroupDelete,
    dialogState:       deleteDialogState,
    confirmDelete:     confirmGroupDelete,
    cancelDelete:      cancelGroupDelete,
  } = useDeleteWithSafetyCheck({
    sourceTable:  'master_dropdown_groups',
    getDeleteUrl: (id) => `/api/superadmin/dropdowns/groups/${id}?mode=hard`,
    confirmTitle: (name) => `Hapus grup "${name}"?`,
    confirmDesc:  'Grup ini dan semua opsinya akan dihapus permanen dari sistem. Tindakan ini tidak bisa dibatalkan.',
    onDeleted:    fetchAll,
  })
  const handleDeleteClick = (grup: GrupDenganOpsi) =>
    _handleGroupDelete({ id: grup.id, displayName: grup.display_name })

  useEffect(() => {
    if (grupList.length === 0) return

    async function fetchSafetyStatusBulk() {
      try {
        const [optionsRes, groupsRes] = await Promise.all([
          fetch('/api/superadmin/usage/safety-status?source_table=master_dropdown_options'),
          fetch('/api/superadmin/usage/safety-status?source_table=master_dropdown_groups'),
        ])
        const [optionsJson, groupsJson] = await Promise.all([
          optionsRes.json() as Promise<{ success: boolean; data: SafetyStatusResult[] }>,
          groupsRes.json()  as Promise<{ success: boolean; data: SafetyStatusResult[] }>,
        ])

        const optionsData = optionsJson.data ?? []
        const groupsData  = groupsJson.data  ?? []

        grupList.filter(g => !g.is_system).forEach(grup => {
          const hasActiveDefault = grup.opsi.some(o => o.is_default && o.is_active)
          if (hasActiveDefault) {
            setVerdict(grup.id, 'TIDAK_BISA')
            return
          }

          const semuaOpsiIds = grup.opsi.filter(o => !o.is_system).map(o => o.id)

          if (semuaOpsiIds.length === 0) {
            setVerdict(grup.id, getVerdictFromBulk(grup.id, groupsData))
            return
          }

          const verdicts = semuaOpsiIds.map(id => getVerdictFromBulk(id, optionsData))
          const grupVerdict: SafetyVerdict =
            verdicts.some(v => v === 'TIDAK_AMAN') ? 'TIDAK_AMAN' :
            verdicts.some(v => v === 'TIDAK_BISA') ? 'TIDAK_BISA' :
            'AMAN'

          setVerdict(grup.id, grupVerdict)
        })

      } catch (err) {
        console.error('[DropdownGroupsClient] fetchSafetyStatusBulk error:', err)
      }
    }

    fetchSafetyStatusBulk()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupList.length])

  async function handleAdd() {
    setAdd(s => ({ ...s, saving: true, error: '' }))
    try {
      const payload: BuatGrupPayload = {
        slug:                 add.slug.trim(),
        display_name:         add.displayName.trim(),
        description:          add.description.trim() || null,
        category:             add.category,
        module:               add.module.trim() || null,
        tenant_can_override:  add.canOverride,
        tenant_override_mode: add.overrideMode,
        is_system:            false,
        sort_order:           Number(add.sortOrder),
      }
      const res  = await fetch('/api/superadmin/dropdowns/groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { success: boolean; message?: string }
      if (!json.success) throw new Error(json.message ?? 'Gagal menyimpan')
      toast.success('Grup berhasil ditambahkan')
      setAdd(ADD_INIT)
      startTransition(() => { fetchAll() })
    } catch (err) {
      setAdd(s => ({ ...s, saving: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan' }))
    }
  }

  function openEdit(grup: GrupDenganOpsi) {
    setEdit({
      open: true, grup,
      displayName: grup.display_name, description: grup.description ?? '',
      canOverride: grup.tenant_can_override, overrideMode: grup.tenant_override_mode,
      sortOrder: String(grup.sort_order), saving: false, error: '',
    })
  }

  async function handleEdit() {
    if (!edit.grup) return
    setEdit(s => ({ ...s, saving: true, error: '' }))
    try {
      const payload: UbahGrupPayload = {
        display_name:         edit.displayName.trim(),
        description:          edit.description.trim() || null,
        tenant_can_override:  edit.canOverride,
        tenant_override_mode: edit.overrideMode,
        sort_order:           Number(edit.sortOrder),
      }
      const res  = await fetch(`/api/superadmin/dropdowns/groups/${edit.grup.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { success: boolean; message?: string }
      if (!json.success) throw new Error(json.message ?? 'Gagal menyimpan')
      toast.success('Grup berhasil diupdate')
      setEdit(EDIT_INIT)
      startTransition(() => { fetchAll() })
    } catch (err) {
      setEdit(s => ({ ...s, saving: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan' }))
    }
  }

  async function handleDeactivate() {
    if (!deact.grup) return
    setDeact(s => ({ ...s, loading: true }))
    try {
      const res  = await fetch(`/api/superadmin/dropdowns/groups/${deact.grup.id}`, { method: 'DELETE' })
      const json = await res.json() as { success: boolean; message?: string; data?: { opsi_dinonaktifkan: number } }
      if (!json.success) throw new Error(json.message ?? 'Gagal menonaktifkan')
      const n = json.data?.opsi_dinonaktifkan ?? 0
      toast.success(`Grup dinonaktifkan${n > 0 ? ` beserta ${n} opsi` : ''}`)
      setDeact({ open: false, grup: null, loading: false })
      startTransition(() => { fetchAll() })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
      setDeact(s => ({ ...s, loading: false }))
    }
  }

  const IconPlus = ICON_ACTION.add

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={TYPOGRAPHY.h2}>Master Dropdown</h1>
          <p className={TYPOGRAPHY.muted}>{grupList.length} grup terdaftar</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAdd(s => ({ ...s, open: true }))}>
          <IconPlus size={14} />Tambah Grup
        </Button>
      </div>

      <DropdownGroupsTable
        filtered={filtered}
        grupList={grupList}
        activeTab={activeTab}
        expandedId={expandedId}
        onTabChange={setActiveTab}
        onToggleExpand={id => setExpandedId(expandedId === id ? null : id)}
        onEdit={openEdit}
        onDeactivate={grup => setDeact({ open: true, grup, loading: false })}
        onDeleteClick={handleDeleteClick}
        onDataChanged={handleDataChanged}
        deleteVerdicts={deleteVerdicts}
      />

      <AddGroupDialog    state={add}  onStateChange={setAdd}  onSave={handleAdd}  />
      <EditGroupDialog   state={edit} onStateChange={setEdit} onSave={handleEdit} />
      <DeactivateGroupDialog
        grup={deact.grup} open={deact.open} loading={deact.loading}
        onClose={() => setDeact({ open: false, grup: null, loading: false })}
        onConfirm={handleDeactivate}
      />
      <DeleteConfirmDialog
        {...deleteDialogState}
        onConfirm={confirmGroupDelete}
        onCancel={cancelGroupDelete}
      />
    </div>
  )
}
