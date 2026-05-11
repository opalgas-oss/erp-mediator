'use client'

// app/dashboard/superadmin/dropdowns/DropdownGroupDialogs.tsx
// Dialog komponen (presentational) untuk grup dropdown: Tambah, Edit, Nonaktifkan.
// Dipanggil dari DropdownGroupsClient.tsx.
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.6

import type { JSX }  from 'react'
import type {
  GrupDenganOpsi,
  BuatGrupPayload,
  UbahGrupPayload,
  DropdownCategory,
  TenantOverrideMode,
} from '@/lib/types/master-dropdown.types'
import {
  DROPDOWN_CATEGORY_LABELS,
  TENANT_OVERRIDE_MODE_LABELS,
} from '@/lib/constants/dropdown-category.constant'

import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

// ─── Re-export konstanta (dipakai juga oleh DropdownGroupsTable + DropdownGroupsClient) ──

export const CATEGORY_LABELS  = DROPDOWN_CATEGORY_LABELS
export const OVERRIDE_MODE_LABELS = TENANT_OVERRIDE_MODE_LABELS

// ─── AddGroupDialog ──────────────────────────────────────────────────────────

export interface AddGroupState {
  open:         boolean
  slug:         string
  displayName:  string
  description:  string
  category:     DropdownCategory
  module:       string
  canOverride:  boolean
  overrideMode: TenantOverrideMode
  sortOrder:    string
  saving:       boolean
  error:        string
}

interface AddGroupDialogProps {
  state:        AddGroupState
  onStateChange: (s: AddGroupState) => void
  onSave:       () => void
}

export function AddGroupDialog({ state: s, onStateChange: set, onSave }: AddGroupDialogProps): JSX.Element {
  return (
    <Dialog open={s.open} onOpenChange={open => set({ ...s, open })}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tambah Grup Dropdown</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ag-slug" className="text-xs">Slug * <span className="text-slate-400">(huruf kecil + _)</span></Label>
              <Input id="ag-slug" placeholder="contoh: time_unit" value={s.slug}
                onChange={e => set({ ...s, slug: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ag-sort" className="text-xs">Sort order</Label>
              <Input id="ag-sort" type="number" value={s.sortOrder}
                onChange={e => set({ ...s, sortOrder: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ag-name" className="text-xs">Nama Tampilan *</Label>
            <Input id="ag-name" placeholder="contoh: Satuan Waktu" value={s.displayName}
              onChange={e => set({ ...s, displayName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ag-desc" className="text-xs">Deskripsi</Label>
            <Input id="ag-desc" placeholder="deskripsi singkat (opsional)" value={s.description}
              onChange={e => set({ ...s, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Kategori *</Label>
              <Select value={s.category} onValueChange={v => set({ ...s, category: v as DropdownCategory })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as DropdownCategory[]).map(cat => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Override Mode</Label>
              <Select
                value={s.overrideMode}
                onValueChange={v => set({ ...s, overrideMode: v as TenantOverrideMode, canOverride: v !== 'none' })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(OVERRIDE_MODE_LABELS) as TenantOverrideMode[]).map(m => (
                    <SelectItem key={m} value={m}>{OVERRIDE_MODE_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {s.error && <p className="text-xs text-destructive">{s.error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => set({ ...s, open: false })}>Batal</Button>
          <Button disabled={s.saving || !s.slug || !s.displayName} onClick={onSave}>
            {s.saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── EditGroupDialog ──────────────────────────────────────────────────────────

export interface EditGroupState {
  open:         boolean
  grup:         GrupDenganOpsi | null
  displayName:  string
  description:  string
  canOverride:  boolean
  overrideMode: TenantOverrideMode
  sortOrder:    string
  saving:       boolean
  error:        string
}

interface EditGroupDialogProps {
  state:         EditGroupState
  onStateChange: (s: EditGroupState) => void
  onSave:        () => void
}

export function EditGroupDialog({ state: s, onStateChange: set, onSave }: EditGroupDialogProps): JSX.Element {
  return (
    <Dialog open={s.open} onOpenChange={open => { if (!s.saving) set({ ...s, open }) }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Grup — {s.grup?.slug}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="eg-name" className="text-xs">Nama Tampilan *</Label>
            <Input id="eg-name" value={s.displayName}
              onChange={e => set({ ...s, displayName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="eg-desc" className="text-xs">Deskripsi</Label>
            <Input id="eg-desc" value={s.description}
              onChange={e => set({ ...s, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Override Mode</Label>
              <Select
                value={s.overrideMode}
                onValueChange={v => set({ ...s, overrideMode: v as TenantOverrideMode, canOverride: v !== 'none' })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(OVERRIDE_MODE_LABELS) as TenantOverrideMode[]).map(m => (
                    <SelectItem key={m} value={m}>{OVERRIDE_MODE_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="eg-sort" className="text-xs">Sort order</Label>
              <Input id="eg-sort" type="number" value={s.sortOrder}
                onChange={e => set({ ...s, sortOrder: e.target.value })} />
            </div>
          </div>
          {s.error && <p className="text-xs text-destructive">{s.error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => set({ ...s, open: false })}>Batal</Button>
          <Button disabled={s.saving || !s.displayName} onClick={onSave}>
            {s.saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── DeactivateGroupDialog ───────────────────────────────────────────────────

interface DeactivateGroupDialogProps {
  grup:      GrupDenganOpsi | null
  open:      boolean
  loading:   boolean
  onClose:   () => void
  onConfirm: () => void
}

export function DeactivateGroupDialog({ grup, open, loading, onClose, onConfirm }: DeactivateGroupDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={o => { if (!loading && !o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nonaktifkan Grup</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">
          Nonaktifkan grup <strong>{grup?.display_name}</strong>?{' '}
          Semua opsi dalam grup ini akan ikut dinonaktifkan.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Batal</Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? 'Memproses...' : 'Nonaktifkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── DeleteConfirmDialog (generic) ───────────────────────────────────────────
//
// Generic delete confirmation dialog — dipakai oleh useDeleteWithSafetyCheck hook.
// Render modal di tengah layar dengan backdrop blur (style sama dengan Dialog Tambah Grup).
// Dipakai untuk konfirmasi delete grup MAUPUN delete opsi (DRY).

interface DeleteConfirmDialogProps {
  open:        boolean
  title:       string
  description: string
  loading:     boolean
  onConfirm:   () => void
  onCancel:    () => void
}

export function DeleteConfirmDialog({
  open, title, description, loading, onConfirm, onCancel,
}: DeleteConfirmDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={o => { if (!loading && !o) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Batal</Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
