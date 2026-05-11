'use client'

// app/dashboard/superadmin/dropdowns/DropdownGroupsClient.tsx
// Orchestrator Master Dropdown — state management + API handlers.
// UI tabel   → DropdownGroupsTable.tsx
// UI dialogs → DropdownGroupDialogs.tsx
// UI opsi    → DropdownOptionsPanel.tsx
//
// PERAN SETELAH S#125 REFACTOR:
//   1. Fetch SafetyStatusFullMap dari /api/superadmin/usage/safety-status (bulk × 2)
//   2. Build map key=`${source_table}:${source_id}` dengan fallback table-level
//   3. Pass map + loading state ke DropdownGroupsTable
//   4. Kelola dialog state untuk hapus grup (verdict dihitung di Table, bukan di sini)
//
// HAPUS DI S#125 (lihat _arsip/sesi-125-refactor-verdict-dropdown/):
//   - getVerdictFromBulk helper (sekarang di useDeletePermission)
//   - setVerdict per item + verdict override (TIDAK_BISA kalau hasActiveDefault)
//     → verdict sekarang dihitung pure functions verdict.ts dari data DB saja
//   - deleteVerdicts state dari useDeleteWithSafetyCheck
//     → useDeleteConfirmDialog HANYA kelola dialog state
//
// Dibuat S#115. Update S#122/S#124. REFACTOR S#125: verdict layer + safety map.

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
  SafetyStatusResult,
  SafetyStatusFullMap,
} from '@/lib/types/usage-tracking.types'
import { useDeleteConfirmDialog } from '@/lib/hooks/useDeleteWithSafetyCheck'
import { ICON_ACTION }            from '@/lib/constants/icons.constant'
import { TYPOGRAPHY }             from '@/lib/constants/ui-tokens.constant'
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

// ─── Helper: build SafetyStatusFullMap dari bulk fetch ──────────────────────

function buildSafetyMap(
  groupsData:  SafetyStatusResult[],
  optionsData: SafetyStatusResult[],
  grupList:    GrupDenganOpsi[],
): SafetyStatusFullMap {

  const map: SafetyStatusFullMap = {}

  const groupsTableLevel  = groupsData.find(r => r.source_id === null)
  const optionsTableLevel = optionsData.find(r => r.source_id === null)

  for (const grup of grupList) {
    const specificGrup = groupsData.find(r => r.source_id === grup.id)
    if (specificGrup) {
      map[`master_dropdown_groups:${grup.id}`] = specificGrup
    } else if (groupsTableLevel) {
      map[`master_dropdown_groups:${grup.id}`] = {
        ...groupsTableLevel,
        source_id: grup.id,
      }
    }

    for (const opsi of grup.opsi) {
      const specificOpsi = optionsData.find(r => r.source_id === opsi.id)
      if (specificOpsi) {
        map[`master_dropdown_options:${opsi.id}`] = specificOpsi
      } else if (optionsTableLevel) {
        map[`master_dropdown_options:${opsi.id}`] = {
          ...optionsTableLevel,
          source_id: opsi.id,
        }
      }
    }
  }

  return map
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

  const [safetyMap,        setSafetyMap]        = useState<SafetyStatusFullMap>({})
  const [safetyMapLoading, setSafetyMapLoading] = useState(true)

  const [, startTransition] = useTransition()

  const filtered = activeTab === 'semua'
    ? grupList
    : grupList.filter(g => g.category === activeTab)

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
    openDialog:    openGroupDeleteDialog,
    dialogState:   deleteDialogState,
    confirmDelete: confirmGroupDelete,
    cancelDelete:  cancelGroupDelete,
  } = useDeleteConfirmDialog({
    getDeleteUrl: (id) => `/api/superadmin/dropdowns/groups/${id}?mode=hard`,
    confirmTitle: (name) => `Hapus grup "${name}"?`,
    confirmDesc:  'Grup ini dan semua opsinya akan dihapus permanen dari sistem. Tindakan ini tidak bisa dibatalkan.',
    onDeleted:    fetchAll,
  })

  const handleDeleteClick = (grup: GrupDenganOpsi) => {
    openGroupDeleteDialog({ id: grup.id, displayName: grup.display_name })
  }

  useEffect(() => {
    if (grupList.length === 0) {
      setSafetyMap({})
      setSafetyMapLoading(false)
      return
    }

    let cancelled = false
    setSafetyMapLoading(true)

    async function fetchSafetyMap() {
      try {
        const [optionsRes, groupsRes] = await Promise.all([
          fetch('/api/superadmin/usage/safety-status?source_table=master_dropdown_options'),
          fetch('/api/superadmin/usage/safety-status?source_table=master_dropdown_groups'),
        ])
        const [optionsJson, groupsJson] = await Promise.all([
          optionsRes.json() as Promise<{ success: boolean; data: SafetyStatusResult[] }>,
          groupsRes.json()  as Promise<{ success: boolean; data: SafetyStatusResult[] }>,
        ])

        if (cancelled) return

        const map = buildSafetyMap(
          groupsJson.data  ?? [],
          optionsJson.data ?? [],
          grupList,
        )
        setSafetyMap(map)
      } catch (err) {
        console.error('[DropdownGroupsClient] fetchSafetyMap error:', err)
      } finally {
        if (!cancelled) setSafetyMapLoading(false)
      }
    }

    fetchSafetyMap()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupList])

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
        safetyMap={safetyMap}
        safetyMapLoading={safetyMapLoading}
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
