'use client'

// app/dashboard/superadmin/categories/DialogBuatKategori.tsx
// Dialog Buat/Edit Kategori — Root atau Sub + mode Edit + toggle Status
// Style: konsisten dengan Tab Info Umum (inline design tokens)
// Fix: G57 (mode Edit), G58 (toggle Aktif/Nonaktif), G59 (slug immutable info)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase F

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { CategoryListItem } from '@/lib/types/category.types'

interface Props {
  open:           boolean
  mode:           'root' | 'sub'
  editTarget?:    CategoryListItem | null
  onClose:        () => void
  onSuccess:      () => void
  existingRoots:  CategoryListItem[]
}

const S = {
  input:    { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
  inputRO:  { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#f9f9f8', color: '#6b7280' } as React.CSSProperties,
  textarea: { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff', resize: 'vertical' as const } as React.CSSProperties,
  label:    { fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' } as React.CSSProperties,
  help:     { fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'block' } as React.CSSProperties,
}

function toSlug(s: string, prefix?: string): string {
  const base = s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-')
  return prefix ? `${prefix}/${base}` : base
}

export function DialogBuatKategori({ open, mode, editTarget, onClose, onSuccess, existingRoots }: Props) {
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [parentId,    setParentId]    = useState('')
  const [displayName, setDisplayName] = useState('')
  const [slug,        setSlug]        = useState('')
  const [desc,        setDesc]        = useState('')
  const [isActive,    setIsActive]    = useState(true)

  const isEdit = !!editTarget
  const slugImmutable = isEdit && (editTarget?.total_tenants ?? 0) > 0

  // Initialize from editTarget
  useEffect(() => {
    if (editTarget) {
      setDisplayName(editTarget.display_name)
      setSlug(editTarget.slug)
      setDesc('')
      setIsActive(editTarget.is_active)
      setParentId(editTarget.parent_id ?? '')
    } else {
      setDisplayName('')
      setSlug('')
      setDesc('')
      setIsActive(true)
      setParentId('')
    }
  }, [editTarget, open])

  // Auto-generate slug saat mode create
  useEffect(() => {
    if (isEdit) return
    const prefix = mode === 'sub' ? existingRoots.find(r => r.id === parentId)?.slug : undefined
    setSlug(toSlug(displayName, prefix))
  }, [displayName, mode, parentId, existingRoots, isEdit])

  const handleClose = () => {
    setError('')
    onClose()
  }

  const handleSubmit = async () => {
    setError('')
    if (!displayName.trim()) { setError('Nama kategori wajib diisi'); return }
    if (!slug.trim())        { setError('Slug wajib diisi'); return }
    if (mode === 'sub' && !parentId && !isEdit) { setError('Pilih kategori root terlebih dahulu'); return }

    setSaving(true)
    try {
      const body = isEdit ? {
        display_name: displayName.trim(),
        slug: slugImmutable ? editTarget!.slug : slug.trim(),
        description: desc || null,
        is_active:    isActive,
      } : {
        display_name: displayName.trim(),
        slug:         slug.trim(),
        description:  desc || null,
        ...(mode === 'sub' ? { parent_id: parentId, level: 2, is_active: isActive } : { level: 1, icon_name: null, icon_bg: null }),
      }

      const url    = isEdit ? `/api/superadmin/categories/${editTarget!.id}` : '/api/superadmin/categories'
      const method = isEdit ? 'PATCH' : 'POST'
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success(`Kategori ${mode === 'root' ? 'root' : 'sub'} berhasil ${isEdit ? 'diperbarui' : 'dibuat'}`)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan kategori')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editTarget || (editTarget.total_tenants ?? 0) > 0) return
    if (!confirm(`Hapus kategori "${editTarget.display_name}"? Aksi ini tidak bisa dibatalkan.`)) return
    try {
      const res  = await fetch(`/api/superadmin/categories/${editTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Kategori berhasil dihapus')
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
    }
  }

  if (!open) return null

  const title = isEdit
    ? `Edit ${mode === 'root' ? 'kategori root' : 'sub-kategori'}`
    : `Tambah ${mode === 'root' ? 'kategori root' : 'sub-kategori'}`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{title}</div>
            {isEdit && editTarget?.parent_id && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {existingRoots.find(r => r.id === editTarget.parent_id)?.display_name} › {editTarget.display_name}
              </div>
            )}
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', borderWidth: 0, cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Parent selector (sub create only) */}
          {mode === 'sub' && !isEdit && (
            <div>
              <label style={S.label}>Kategori root (induk) *</label>
              <select value={parentId} onChange={e => setParentId(e.target.value)} style={{ ...S.input, padding: '8px 10px' }}>
                <option value="">Pilih root kategori…</option>
                {existingRoots.filter(r => r.is_active).map(r => (
                  <option key={r.id} value={r.id}>{r.display_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={S.label}>Nama kategori *</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder={mode === 'root' ? 'Contoh: Otomotif' : 'Contoh: Servis Mobil'} style={S.input} />
          </div>

          {/* Slug + G59 immutable info */}
          <div>
            <label style={S.label}>Slug</label>
            <input value={slug} onChange={e => !slugImmutable && setSlug(e.target.value)}
              readOnly={slugImmutable}
              placeholder={mode === 'root' ? 'otomotif' : 'otomotif/servis-mobil'}
              style={slugImmutable ? { ...S.inputRO, fontFamily: 'monospace' } : { ...S.input, fontFamily: 'monospace' }} />
            {slugImmutable ? (
              <span style={S.help}>
                <i className="ti ti-lock" style={{ marginRight: 3 }} />
                Tidak bisa diubah: ada {editTarget?.total_tenants} assignment aktif
              </span>
            ) : (
              <span style={S.help}>Huruf kecil, angka, tanda hubung. Auto-generated dari nama.</span>
            )}
          </div>

          <div>
            <label style={S.label}>Deskripsi (opsional)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Deskripsi singkat kategori…" rows={2} style={S.textarea} />
          </div>

          {/* G58 — Toggle status (hanya saat Edit, atau saat create sub-kategori) */}
          {(isEdit || mode === 'sub') && (
            <div>
              <label style={S.label}>Status</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setIsActive(true)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, textAlign: 'center', cursor: 'pointer',
                    borderWidth: '0.5px', borderStyle: 'solid', fontFamily: 'inherit',
                    borderColor: isActive ? '#97C459' : 'rgba(0,0,0,0.22)',
                    background: isActive ? '#EAF3DE' : '#f9f9f8',
                    color:      isActive ? '#3B6D11' : '#6b7280',
                    fontWeight: isActive ? 500 : 400,
                  }}>
                  <i className="ti ti-circle-check" style={{ marginRight: 4 }} /> Aktif
                </button>
                <button onClick={() => setIsActive(false)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, textAlign: 'center', cursor: 'pointer',
                    borderWidth: '0.5px', borderStyle: 'solid', fontFamily: 'inherit',
                    borderColor: !isActive ? '#B4B2A9' : 'rgba(0,0,0,0.12)',
                    background: !isActive ? '#F1EFE8' : '#f9f9f8',
                    color: '#6b7280',
                    fontWeight: !isActive ? 500 : 400,
                  }}>
                  <i className="ti ti-eye-off" style={{ marginRight: 4 }} /> Nonaktif
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#FCEBEB', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#F09595', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#A32D2D' }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', display: 'flex', justifyContent: isEdit ? 'space-between' : 'flex-end', gap: 10, background: '#f9f9f8' }}>

          {/* G57 — Tombol hapus di kiri saat Edit */}
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={(editTarget?.total_tenants ?? 0) > 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: (editTarget?.total_tenants ?? 0) > 0 ? 'not-allowed' : 'pointer',
                borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#F09595', color: '#A32D2D', background: 'transparent',
                opacity: (editTarget?.total_tenants ?? 0) > 0 ? 0.5 : 1,
              }}>
              <i className="ti ti-trash" /> Hapus
            </button>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleClose} disabled={saving}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', color: '#1a1a1a', background: 'transparent' }}>
              Batal
            </button>
            <button onClick={handleSubmit} disabled={saving || !displayName || !slug}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB', opacity: (saving || !displayName || !slug) ? 0.5 : 1 }}>
              <i className="ti ti-device-floppy" />
              {saving ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Simpan kategori'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
