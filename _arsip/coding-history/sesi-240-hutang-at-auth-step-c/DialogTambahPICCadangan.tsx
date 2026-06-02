'use client'

// app/dashboard/superadmin/tenants/[id]/DialogTambahPICCadangan.tsx
// Dialog form — Tambah / Edit PIC Cadangan (mode: 'tambah' | 'edit')
// Mode 'hapus' ada di: DialogHapusPICCadangan.tsx
// API: tambah → POST /change-pic {action:cadangan} · edit → PATCH /change-pic/cadangan
//
// Dibuat: Sesi #147 — HUTANG-02 M6 Tenant Management

import { useState, useEffect }      from 'react'
import { toast }                     from 'sonner'
import type { PICKartu, PICRelasiPerusahaan } from '@/lib/types/tenant-pic.types'
import { PIC_RELASI_OPTIONS }        from '@/lib/constants/tenant.constant'
import { autoCorrectWA }             from '@/lib/utils-client'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tenantId:  string
  open:      boolean
  mode:      'tambah' | 'edit'
  existing:  PICKartu | null    // diisi saat mode='edit'
  onClose:   () => void
  onSuccess: () => void
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const S = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog:  { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' as const },
  header:  { padding: '16px 20px', borderBottomWidth: '0.5px', borderBottomStyle: 'solid' as const, borderBottomColor: 'rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  body:    { padding: '20px' },
  footer:  { padding: '12px 20px', borderTopWidth: '0.5px', borderTopStyle: 'solid' as const, borderTopColor: 'rgba(0,0,0,0.10)', display: 'flex', justifyContent: 'flex-end', gap: 8 },
  label:   { display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 5 } as React.CSSProperties,
  input:   { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.18)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' as const },
  select:  { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.18)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' as const },
  field:   { marginBottom: 14 } as React.CSSProperties,
  btn:     { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit' } as React.CSSProperties,
  hint:    { fontSize: 11, color: '#9ca3af', marginTop: 3 } as React.CSSProperties,
}

// ─── Form state awal ──────────────────────────────────────────────────────────

const INIT = { user_name: '', jabatan: '', relasi_ke_perusahaan: '' as PICRelasiPerusahaan | '', user_wa: '', user_email: '' }

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function DialogTambahPICCadangan({ tenantId, open, mode, existing, onClose, onSuccess }: Props) {
  const [form,       setForm]       = useState(INIT)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && existing) {
      setForm({
        user_name:            existing.user_name,
        jabatan:              existing.jabatan ?? '',
        relasi_ke_perusahaan: existing.relasi_ke_perusahaan ?? '',
        user_wa:              existing.user_wa ?? '',
        user_email:           existing.user_email ?? '',
      })
    } else {
      setForm(INIT)
    }
  }, [open, mode, existing])

  if (!open) return null

  async function handleSubmit() {
    if (!form.user_name.trim())      { toast.error('Nama PIC cadangan wajib diisi'); return }
    if (!form.user_wa.trim())        { toast.error('Nomor WA wajib diisi'); return }
    if (!form.user_email.trim())     { toast.error('Email wajib diisi'); return }
    if (!form.relasi_ke_perusahaan)  { toast.error('Relasi ke perusahaan wajib dipilih'); return }

    // edit   = PATCH /change-pic/cadangan → UPDATE in-place (tanpa riwayat pergantian)
    // tambah = POST /change-pic action cadangan
    const editMode = mode === 'edit'
    const fields = {
      user_name:            form.user_name.trim(),
      jabatan:              form.jabatan.trim() || null,
      relasi_ke_perusahaan: form.relasi_ke_perusahaan,
      user_wa:              autoCorrectWA(form.user_wa),
      user_email:           form.user_email.trim().toLowerCase(),
    }
    const url  = `/api/superadmin/tenants/${tenantId}/change-pic${editMode ? '/cadangan' : ''}`
    const body = editMode ? fields : { action: 'cadangan', ...fields }

    setSubmitting(true)
    try {
      const res = await fetch(url, {
        method: editMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Gagal menyimpan PIC cadangan')
      toast.success(editMode ? 'PIC cadangan berhasil diperbarui' : 'PIC cadangan berhasil ditambahkan')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = mode === 'edit'

  return (
    <div style={S.overlay} onClick={() => !submitting && onClose()}>
      <div style={S.dialog} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={`ti ${isEdit ? 'ti-pencil' : 'ti-user-plus'}`} style={{ color: '#534AB7' }} />
            {isEdit ? 'Edit PIC Cadangan' : 'Tambah PIC Cadangan'}
          </div>
          <button onClick={onClose} disabled={submitting} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, padding: 0 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Body */}
        <div style={S.body}>
          <div style={S.field}>
            <label style={S.label}>Nama Lengkap <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={S.input} placeholder="Nama lengkap PIC cadangan" value={form.user_name}
              onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))} disabled={submitting} />
          </div>

          <div style={S.field}>
            <label style={S.label}>Jabatan / Posisi</label>
            <input style={S.input} placeholder="Cth: Manajer Operasional" value={form.jabatan}
              onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))} disabled={submitting} />
          </div>

          <div style={S.field}>
            <label style={S.label}>Relasi ke Perusahaan <span style={{ color: '#ef4444' }}>*</span></label>
            <select style={S.select} value={form.relasi_ke_perusahaan}
              onChange={e => setForm(f => ({ ...f, relasi_ke_perusahaan: e.target.value as PICRelasiPerusahaan }))} disabled={submitting}>
              <option value="">— Pilih relasi —</option>
              {PIC_RELASI_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Nomor WhatsApp <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={S.input} placeholder="628xxx (auto-koreksi 08xx)" value={form.user_wa}
              onChange={e => setForm(f => ({ ...f, user_wa: e.target.value }))}
              onBlur={e => setForm(f => ({ ...f, user_wa: autoCorrectWA(e.target.value) }))} disabled={submitting} />
            <div style={S.hint}>Format: 62xxx — otomatis dikoreksi dari 08xx</div>
          </div>

          <div style={{ ...S.field, marginBottom: 0 }}>
            <label style={S.label}>Email Personal <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={S.input} placeholder="email@example.com" type="email" value={form.user_email}
              onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} disabled={submitting} />
            <div style={S.hint}>Email personal PIC, bukan email resmi perusahaan</div>
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button onClick={onClose} disabled={submitting} style={{ ...S.btn, background: '#f3f4f6', color: '#374151' }}>Batal</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ ...S.btn, background: '#EEEDFE', color: '#534AB7' }}>
            {submitting
              ? <><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} /> Menyimpan…</>
              : <><i className={`ti ${isEdit ? 'ti-check' : 'ti-user-plus'}`} style={{ fontSize: 13 }} /> {isEdit ? 'Simpan Perubahan' : 'Tambah PIC Cadangan'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
