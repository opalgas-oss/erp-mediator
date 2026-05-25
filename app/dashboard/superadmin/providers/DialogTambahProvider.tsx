'use client'
// app/dashboard/superadmin/providers/DialogTambahProvider.tsx
// Dialog tambah provider baru dari dashboard SA.
// UI sesuai MOCKUP_TAMBAH_PROVIDER_v1.html yang disetujui Philips S#217.
// Kode unik TIDAK ditampilkan — auto-generate backend dari nama.
// Dibuat: Sesi #218

import { useState, useCallback } from 'react'
import { toast }                  from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { TambahFieldDefPayload, FieldInputType } from '@/lib/types/provider.types'

// ─── Konstanta ───────────────────────────────────────────────────────────────

const KATEGORI_OPTIONS = [
  { value: 'email',      label: 'Email' },
  { value: 'messaging',  label: 'Notifikasi WA' },
  { value: 'payment',    label: 'Payment Gateway' },
  { value: 'media',      label: 'Media & Storage' },
  { value: 'cache',      label: 'Cache' },
  { value: 'database',   label: 'Database' },
  { value: 'search',     label: 'Pencarian' },
  { value: 'cdn',        label: 'CDN & WAF' },
  { value: 'management', label: 'API Management' },
  { value: 'queue',      label: 'Cron Scheduler' },
]

const TIPE_OPTIONS: Array<{ value: FieldInputType; label: string }> = [
  { value: 'text',   label: 'text' },
  { value: 'secret', label: 'secret' },
  { value: 'email',  label: 'email' },
  { value: 'url',    label: 'url' },
  { value: 'number', label: 'number' },
]

// ─── Tipe internal ───────────────────────────────────────────────────────────

interface FieldRow extends TambahFieldDefPayload {
  _id:      number   // key unik lokal untuk React
  expanded: boolean
}

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
}

// ─── Helper: auto-generate field_key dari label ───────────────────────────────

function toFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

// ─── Style helpers (ikuti pola DialogKonfigurasiKoneksi — inline style) ───────

const S = {
  label:   { fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' } as React.CSSProperties,
  input:   { border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#1a1a1a', background: '#fff', fontFamily: 'inherit', width: '100%', outline: 'none' } as React.CSSProperties,
  select:  { border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#1a1a1a', background: '#fff', fontFamily: 'inherit', width: '100%', outline: 'none' } as React.CSSProperties,
  hint:    { fontSize: 11, color: '#9ca3af', marginTop: 3 } as React.CSSProperties,
  section: { fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 12 },
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function DialogTambahProvider({ open, onClose, onSuccess }: Props) {
  const [nama,      setNama]      = useState('')
  const [kategori,  setKategori]  = useState('email')
  const [tag,       setTag]       = useState<'wajib' | 'disarankan' | 'opsional'>('opsional')
  const [deskripsi, setDeskripsi] = useState('')
  const [docsUrl,   setDocsUrl]   = useState('')
  const [fields,    setFields]    = useState<FieldRow[]>([])
  const [saving,    setSaving]    = useState(false)
  const [nextId,    setNextId]    = useState(0)

  const resetForm = useCallback(() => {
    setNama(''); setKategori('email'); setTag('opsional')
    setDeskripsi(''); setDocsUrl(''); setFields([]); setNextId(0)
  }, [])

  const close = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // Tambah baris field baru
  const addField = useCallback(() => {
    const id = nextId
    setNextId(n => n + 1)
    setFields(prev => [...prev, {
      _id: id, expanded: false,
      label: '', field_key: '', tipe: 'text',
      is_required: true, is_secret: false,
      placeholder: null, deskripsi: null, sort_order: prev.length,
    }])
  }, [nextId])

  // Hapus satu field
  const removeField = useCallback((id: number) => {
    setFields(prev => prev.filter(f => f._id !== id).map((f, i) => ({ ...f, sort_order: i })))
  }, [])

  // Toggle expand per baris
  const toggleExpand = useCallback((id: number) => {
    setFields(prev => prev.map(f => f._id === id ? { ...f, expanded: !f.expanded } : f))
  }, [])

  // Update satu field
  const updateField = useCallback(<K extends keyof FieldRow>(id: number, key: K, value: FieldRow[K]) => {
    setFields(prev => prev.map(f => {
      if (f._id !== id) return f
      const updated = { ...f, [key]: value }
      // Auto-generate key dari label (hanya jika key belum diedit manual ke label berbeda)
      if (key === 'label') {
        updated.field_key = toFieldKey(value as string)
      }
      return updated
    }))
  }, [])

  // Simpan provider
  const save = useCallback(async () => {
    if (!nama.trim()) { toast.error('Nama provider wajib diisi'); return }

    // Validasi field rows
    for (const fd of fields) {
      if (!fd.label.trim() || !fd.field_key.trim()) {
        toast.error('Label dan Key wajib diisi untuk setiap field credential')
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama:       nama.trim(),
          kategori,
          tag,
          deskripsi:  deskripsi.trim() || null,
          docs_url:   docsUrl.trim()   || null,
          field_defs: fields.map(({ label, field_key, tipe, is_required, is_secret, placeholder, deskripsi: fd, sort_order }) => ({
            label, field_key, tipe, is_required, is_secret, placeholder, deskripsi: fd, sort_order,
          })),
        }),
      }).then(r => r.json())

      if (!res.success) {
        toast.error(res.message ?? 'Gagal menyimpan provider')
        return
      }

      toast.success(`Provider "${nama.trim()}" berhasil ditambahkan`)
      resetForm()
      onSuccess()
    } catch {
      toast.error('Terjadi error jaringan')
    } finally {
      setSaving(false)
    }
  }, [nama, kategori, tag, deskripsi, docsUrl, fields, resetForm, onSuccess])

  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <DialogTitle className="sr-only">Tambah provider baru</DialogTitle>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>Tambah provider baru</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Daftarkan layanan eksternal yang akan dipakai platform</div>
          </div>
          <button onClick={close} style={{ fontSize: 18, color: '#6b7280', cursor: 'pointer', border: 'none', background: 'none', lineHeight: 1 }}>✕</button>
        </div>

        {/* Body — scrollable */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', maxHeight: '65vh' }}>

          {/* Identitas provider */}
          <div>
            <p style={S.section}>Identitas provider</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

              {/* Nama — full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={S.label}>Nama provider <span style={{ color: '#e24b4a' }}>*</span></label>
                <input
                  style={S.input} type="text" value={nama}
                  onChange={e => setNama(e.target.value)}
                  placeholder="Nama tampil di dashboard SA"
                />
                <span style={S.hint}>Kode unik dibuat otomatis dari nama oleh sistem</span>
              </div>

              {/* Kategori */}
              <div>
                <label style={S.label}>Kategori <span style={{ color: '#e24b4a' }}>*</span></label>
                <select style={S.select} value={kategori} onChange={e => setKategori(e.target.value)}>
                  {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Tag */}
              <div>
                <label style={S.label}>Tag</label>
                <select style={S.select} value={tag} onChange={e => setTag(e.target.value as typeof tag)}>
                  <option value="opsional">Opsional</option>
                  <option value="disarankan">Disarankan</option>
                  <option value="wajib">Wajib</option>
                </select>
              </div>

              {/* Deskripsi — full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={S.label}>Deskripsi singkat</label>
                <input
                  style={S.input} type="text" value={deskripsi}
                  onChange={e => setDeskripsi(e.target.value)}
                  placeholder="Contoh: Layanan kirim email via REST API — tanpa SMTP"
                />
              </div>

              {/* Docs URL — full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={S.label}>URL Dokumentasi</label>
                <input
                  style={S.input} type="url" value={docsUrl}
                  onChange={e => setDocsUrl(e.target.value)}
                  placeholder="https://docs.provider.com"
                />
              </div>
            </div>
          </div>

          {/* Field credential */}
          <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ ...S.section, marginBottom: 2 }}>Field credential</p>
                <p style={{ fontSize: 11, color: '#9ca3af' }}>Field yang harus diisi SA saat setup nanti · klik baris untuk detail</p>
              </div>
              <button
                onClick={addField}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.2)', fontSize: 12, color: '#1a1a1a', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + Tambah field
              </button>
            </div>

            {fields.length > 0 && (
              <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden' }}>
                {/* Header tabel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 56px 56px 60px', background: '#f9f9f8', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
                  {['Label tampil', 'Key (internal)', 'Tipe', 'Wajib', 'Rahasia', ''].map((h, i) => (
                    <div key={i} style={{ padding: '7px 10px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: i >= 3 ? 'center' : 'left' }}>{h}</div>
                  ))}
                </div>

                {/* Baris field */}
                {fields.map((fd) => (
                  <div key={fd._id} style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                    {/* Baris utama */}
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 56px 56px 60px', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => toggleExpand(fd._id)}
                    >
                      <div style={{ padding: '8px 10px' }}>
                        <input
                          type="text" value={fd.label}
                          style={{ ...S.input, padding: '4px 7px', fontSize: 12 }}
                          placeholder="Label tampil"
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateField(fd._id, 'label', e.target.value)}
                        />
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <input
                          type="text" value={fd.field_key}
                          style={{ ...S.input, padding: '4px 7px', fontSize: 12, fontFamily: 'monospace', background: '#f9f9f8' }}
                          placeholder="field_key"
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateField(fd._id, 'field_key', e.target.value)}
                        />
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <select
                          value={fd.tipe}
                          style={{ ...S.select, padding: '4px 7px', fontSize: 12 }}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateField(fd._id, 'tipe', e.target.value as FieldInputType)}
                        >
                          {TIPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <input
                          type="checkbox" checked={fd.is_required}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateField(fd._id, 'is_required', e.target.checked)}
                        />
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <input
                          type="checkbox" checked={fd.is_secret}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateField(fd._id, 'is_secret', e.target.checked)}
                        />
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#6b7280', transition: 'transform 0.2s', display: 'inline-block', transform: fd.expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                        <span
                          style={{ fontSize: 14, color: '#9ca3af', cursor: 'pointer' }}
                          onClick={e => { e.stopPropagation(); removeField(fd._id) }}
                          title="Hapus field"
                        >🗑</span>
                      </div>
                    </div>

                    {/* Baris expand: Placeholder + Deskripsi */}
                    {fd.expanded && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '10px 12px 12px', background: '#f9f9f8', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                        <div>
                          <label style={{ ...S.label, marginBottom: 4 }}>Placeholder <span style={S.hint}>(contoh nilai)</span></label>
                          <input
                            type="text" value={fd.placeholder ?? ''}
                            style={{ ...S.input, fontSize: 12, padding: '5px 8px' }}
                            placeholder="mis. re_xxxxxxxxxx"
                            onChange={e => updateField(fd._id, 'placeholder', e.target.value || null)}
                          />
                        </div>
                        <div>
                          <label style={{ ...S.label, marginBottom: 4 }}>Deskripsi <span style={S.hint}>(panduan SA)</span></label>
                          <input
                            type="text" value={fd.deskripsi ?? ''}
                            style={{ ...S.input, fontSize: 12, padding: '5px 8px' }}
                            placeholder="Panduan singkat saat isi credential"
                            onChange={e => updateField(fd._id, 'deskripsi', e.target.value || null)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {fields.length === 0 && (
              <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
                Belum ada field credential — provider bisa ditambah tanpa field (konfigurasi melalui cara lain)
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Setelah tersimpan → klik &quot;+ Setup&quot; di tabel untuk isi credentials</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={close}
              style={{ padding: '7px 14px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.2)', fontSize: 13, color: '#6b7280', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Batal
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{ padding: '7px 14px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.35)', fontSize: 13, color: '#1a1a1a', background: saving ? '#f3f4f6' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan provider'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
