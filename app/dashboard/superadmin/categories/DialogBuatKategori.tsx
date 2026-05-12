'use client'

// app/dashboard/superadmin/categories/DialogBuatKategori.tsx
// Dialog Buat Kategori — Root atau Sub-kategori
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState, useEffect } from 'react'
import { toast }               from 'sonner'
import { Button }              from '@/components/ui/button'
import { Input }               from '@/components/ui/input'
import { Label }               from '@/components/ui/label'
import { Textarea }            from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { CategoryListItem, BuatRootCategoryPayload, BuatSubCategoryPayload } from '@/lib/types/category.types'

interface Props {
  open:           boolean
  onClose:        () => void
  onSuccess:      () => void
  existingRoots:  CategoryListItem[]
}

type Mode = 'root' | 'sub'

function toSlug(s: string, prefix?: string): string {
  const base = s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-')
  return prefix ? `${prefix}/${base}` : base
}

export function DialogBuatKategori({ open, onClose, onSuccess, existingRoots }: Props) {
  const [mode,      setMode]      = useState<Mode>('root')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [parentId,  setParentId]  = useState('')
  const [displayName, setDisplayName] = useState('')
  const [slug,      setSlug]      = useState('')
  const [desc,      setDesc]      = useState('')

  // Auto-generate slug dari nama
  useEffect(() => {
    const prefix = mode === 'sub'
      ? existingRoots.find(r => r.id === parentId)?.slug
      : undefined
    setSlug(toSlug(displayName, prefix))
  }, [displayName, mode, parentId, existingRoots])

  const handleClose = () => {
    setMode('root'); setDisplayName(''); setSlug(''); setDesc(''); setParentId(''); setError('')
    onClose()
  }

  const handleSubmit = async () => {
    setError('')
    if (!displayName.trim()) { setError('Nama kategori wajib diisi'); return }
    if (!slug.trim())        { setError('Slug wajib diisi'); return }
    if (mode === 'sub' && !parentId) { setError('Pilih kategori root terlebih dahulu'); return }

    setSaving(true)
    try {
      const body =
        mode === 'root'
          ? {
              display_name: displayName.trim(),
              slug:         slug.trim(),
              description:  desc || null,
              icon_name:    null,
              icon_bg:      null,
              level:        1,
            } satisfies BuatRootCategoryPayload & { level: number }
          : {
              display_name: displayName.trim(),
              slug:         slug.trim(),
              description:  desc || null,
              parent_id:    parentId,
              icon_name:    null,
              is_active:    true,
              level:        2,
            } satisfies BuatSubCategoryPayload & { level: number }

      const res  = await fetch('/api/superadmin/categories', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success(`Kategori ${mode === 'root' ? 'root' : 'sub'} berhasil dibuat`)
      onSuccess()
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat kategori')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Kategori</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('root')}
              className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                mode === 'root' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/30'
              }`}
            >
              Root Kategori
            </button>
            <button
              onClick={() => setMode('sub')}
              className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                mode === 'sub' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/30'
              }`}
            >
              Sub-Kategori
            </button>
          </div>

          {/* Parent selector (hanya saat sub) */}
          {mode === 'sub' && (
            <div className="space-y-1.5">
              <Label>Kategori Root (induk) <span className="text-destructive">*</span></Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue placeholder="Pilih root kategori..." /></SelectTrigger>
                <SelectContent>
                  {existingRoots.filter(r => r.is_active).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nama */}
          <div className="space-y-1.5">
            <Label>Nama Kategori <span className="text-destructive">*</span></Label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={mode === 'root' ? 'Contoh: Otomotif' : 'Contoh: Servis Mobil'}
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="font-mono text-sm"
              placeholder={mode === 'root' ? 'otomotif' : 'otomotif/servis-mobil'}
            />
            <p className="text-xs text-muted-foreground">Huruf kecil, angka, tanda hubung. Tidak bisa diubah setelah ada assignment aktif.</p>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <Label>Deskripsi (opsional)</Label>
            <Textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Deskripsi singkat kategori..."
              rows={2}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving || !displayName || !slug}>
            {saving ? 'Menyimpan...' : 'Buat Kategori'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
