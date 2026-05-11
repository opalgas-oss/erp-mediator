'use client'

// app/dashboard/superadmin/dropdowns/DropdownOptionDialogs.tsx
// Dialog presentational untuk opsi dropdown: Tambah dan Edit opsi.
// Dipanggil dari DropdownOptionsPanel.tsx.
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.6

import type { JSX } from 'react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

// ─── AddOptionDialog ──────────────────────────────────────────────────────────

export interface AddOptionState {
  open:         boolean
  slug:         string
  label:        string
  stringValue:  string
  numericValue: string
  sortOrder:    string
  saving:       boolean
  error:        string
}

interface AddOptionDialogProps {
  state:         AddOptionState
  grupName:      string
  onStateChange: (s: AddOptionState) => void
  onSave:        () => void
}

export function AddOptionDialog({ state: s, grupName, onStateChange: set, onSave }: AddOptionDialogProps): JSX.Element {
  return (
    <Dialog open={s.open} onOpenChange={open => set({ ...s, open })}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah Opsi — {grupName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ao-slug" className="text-xs">Slug *</Label>
            <Input id="ao-slug" placeholder="contoh: aktif" value={s.slug}
              onChange={e => set({ ...s, slug: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ao-label" className="text-xs">Label *</Label>
            <Input id="ao-label" placeholder="contoh: Aktif" value={s.label}
              onChange={e => set({ ...s, label: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ao-val" className="text-xs">Nilai (string)</Label>
            <Input id="ao-val" placeholder="nilai string opsional" value={s.stringValue}
              onChange={e => set({ ...s, stringValue: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="ao-num" className="text-xs">Nilai numerik</Label>
              <Input id="ao-num" type="number" placeholder="0" value={s.numericValue}
                onChange={e => set({ ...s, numericValue: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ao-sort" className="text-xs">Sort order</Label>
              <Input id="ao-sort" type="number" placeholder="0" value={s.sortOrder}
                onChange={e => set({ ...s, sortOrder: e.target.value })} />
            </div>
          </div>
          {s.error && <p className="text-xs text-destructive">{s.error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => set({ ...s, open: false })}>Batal</Button>
          <Button disabled={s.saving || !s.slug || !s.label} onClick={onSave}>
            {s.saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── EditOptionDialog ─────────────────────────────────────────────────────────

export interface EditOptionState {
  open:         boolean
  opsiId:       string | null
  opsiLabel:    string
  label:        string
  stringValue:  string
  numericValue: string
  sortOrder:    string
  saving:       boolean
  error:        string
}

interface EditOptionDialogProps {
  state:         EditOptionState
  onStateChange: (s: EditOptionState) => void
  onSave:        () => void
}

export function EditOptionDialog({ state: s, onStateChange: set, onSave }: EditOptionDialogProps): JSX.Element {
  return (
    <Dialog open={s.open} onOpenChange={open => { if (!s.saving) set({ ...s, open }) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Opsi — {s.opsiLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="eo-label" className="text-xs">Label *</Label>
            <Input id="eo-label" value={s.label}
              onChange={e => set({ ...s, label: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="eo-val" className="text-xs">Nilai (string)</Label>
            <Input id="eo-val" value={s.stringValue}
              onChange={e => set({ ...s, stringValue: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="eo-num" className="text-xs">Nilai numerik</Label>
              <Input id="eo-num" type="number" value={s.numericValue}
                onChange={e => set({ ...s, numericValue: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="eo-sort" className="text-xs">Sort order</Label>
              <Input id="eo-sort" type="number" value={s.sortOrder}
                onChange={e => set({ ...s, sortOrder: e.target.value })} />
            </div>
          </div>
          {s.error && <p className="text-xs text-destructive">{s.error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => set({ ...s, open: false })}>Batal</Button>
          <Button disabled={s.saving || !s.label} onClick={onSave}>
            {s.saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
