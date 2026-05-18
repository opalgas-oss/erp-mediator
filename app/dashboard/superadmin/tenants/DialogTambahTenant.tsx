'use client'

// app/dashboard/superadmin/tenants/DialogTambahTenant.tsx
// Dialog Tambah Tenant — SATU FORM (2 section: Data tenant + PIC pertama)
// Style: konsisten dengan Tab Info Umum (inline design tokens)
// Fix: G06 (nama legal wajib), G07 (label tanpa "(slug)"), G08 (NPWP validasi),
//      G09 (urutan PIC), G10 (label "Nomor WA PIC"), G11 (auto-correct WA),
//      G12 (uniqueness debounce), G13 (info box di bawah form)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase F (rebuild dari 2-step ke single form)
// Diupdate: Sesi #149 — DRY fix: hapus autoCorrectWA lokal, pakai shared lib/utils-client

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { BuatTenantPayload, TenantTipe, TenantTier } from '@/lib/types/tenant.types'
import { autoCorrectWA } from '@/lib/utils-client'

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
  /** Opsi paket billing dari M4 tenant_tipe — FIX T-060b S#178 */
  tierOpsi:  { value: TenantTier; label: string }[]
}

// FIX T-060b S#178: tambah tier ke INIT (default 'starter' sampai M4 terload)
const INIT: BuatTenantPayload = {
  nama_brand: '', nama_legal: '', slug: '',
  tipe: 'eksternal', tier: 'starter', npwp: '',
  pic_name: '', pic_email: '', pic_wa: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 50)
}

function validateNPWP(s: string): { ok: boolean; msg?: string } {
  const clean = s.trim()
  if (!clean) return { ok: false, msg: 'NPWP wajib diisi' }
  const digits = clean.replace(/\D/g, '')
  if (digits.length < 5) return { ok: false, msg: 'NPWP tidak valid' }
  return { ok: true }
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const S = {
  input: { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
  inputErr: { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: '#A32D2D', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
  select: { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' } as React.CSSProperties,
  help: { fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'block' } as React.CSSProperties,
  err: { fontSize: 11, color: '#A32D2D', marginTop: 2, display: 'block' } as React.CSSProperties,
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function DialogTambahTenant({ open, onClose, onSuccess, tierOpsi }: Props) {
  const [form,        setForm]        = useState<BuatTenantPayload>(INIT)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [npwpError,   setNpwpError]   = useState('')
  const [slugStatus,  setSlugStatus]  = useState<'idle' | 'checking' | 'taken' | 'available'>('idle')

  const set = (key: keyof BuatTenantPayload, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleNamaBrand = (val: string) => {
    setForm(f => ({ ...f, nama_brand: val, slug: toSlug(val) }))
  }

  const handleClose = () => {
    setForm(INIT)
    setError('')
    setNpwpError('')
    setSlugStatus('idle')
    onClose()
  }

  // Debounce slug uniqueness check — auto-increment jika taken (G12)
  useEffect(() => {
    if (!form.slug || form.slug.length < 3) {
      setSlugStatus('idle')
      return
    }
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/superadmin/tenants/check-slug?slug=${encodeURIComponent(form.slug)}`)
        const json = await res.json()
        if (!json.available) {
          // Auto-increment: strip trailing -N, append -2
          const base = form.slug.replace(/-\d+$/, '')
          set('slug', `${base}-2`)
        } else {
          setSlugStatus('available')
        }
      } catch {
        setSlugStatus('idle')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.slug])

  // Validate NPWP onBlur (G08)
  const handleNpwpBlur = () => {
    const v = validateNPWP(form.npwp)
    setNpwpError(v.ok ? '' : v.msg ?? '')
  }

  // Auto-correct WA onBlur (G11)
  const handleWaBlur = () => {
    set('pic_wa', autoCorrectWA(form.pic_wa))
  }

  const canSubmit =
    !!form.nama_brand &&
    !!form.nama_legal &&
    !!form.slug &&
    !!form.npwp &&
    validateNPWP(form.npwp).ok &&
    !!form.pic_name &&
    !!form.pic_wa &&
    !!form.pic_email

  const handleSubmit = async () => {
    if (!canSubmit) return
    setError('')
    setSaving(true)
    try {
      const res  = await fetch('/api/superadmin/tenants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSuccess()
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat tenant')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>Tambah Tenant Baru</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Isi data minimal — detail dilengkapi di halaman tenant setelah aktif</div>
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', borderWidth: 0, cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', flex: 1 }}>

          {/* Section 1 — Data Tenant */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 8, background: '#E6F1FB', color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              <i className="ti ti-building" />
            </div>
            Data tenant
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={S.label}>Nama brand *</label>
              <input value={form.nama_brand} onChange={e => handleNamaBrand(e.target.value)} placeholder="Contoh: Jaya Motor" style={S.input} />
            </div>

            {/* G06 — Nama legal wajib */}
            <div>
              <label style={S.label}>Nama legal perusahaan *</label>
              <input value={form.nama_legal} onChange={e => set('nama_legal', e.target.value)} placeholder="Contoh: PT Jaya Motor Indonesia" style={S.input} />
              <span style={S.help}>Nama resmi di akta pendirian. Bisa berbeda dari nama brand.</span>
            </div>

            {/* Kode tenant — auto-generate dari nama brand, tidak ditampilkan ke user */}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={S.label}>Tipe tenant *</label>
                <select value={form.tipe} onChange={e => set('tipe', e.target.value as TenantTipe)} style={S.select}>
                  <option value="internal">Internal — dioperasikan platform</option>
                  <option value="eksternal">Eksternal — disewakan ke pihak ketiga</option>
                </select>
              </div>
              {/* FIX T-060b S#178: tambah tier select dari M4 tenant_tipe */}
              <div>
                <label style={S.label}>Paket billing *</label>
                <select
                  value={form.tier}
                  onChange={e => set('tier', e.target.value as TenantTier)}
                  style={S.select}
                >
                  {tierOpsi.length > 0
                    ? tierOpsi.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))
                    : (
                        <>
                          <option value="starter">Starter</option>
                          <option value="growth">Growth</option>
                          <option value="enterprise">Enterprise</option>
                        </>
                      )
                  }
                </select>
                <span style={S.help}>Paket layanan tenant — bisa diubah di halaman detail.</span>
              </div>
            </div>
            <div>
              <label style={S.label}>NPWP perusahaan *</label>
              <input
                value={form.npwp}
                onChange={e => { set('npwp', e.target.value); if (npwpError) setNpwpError('') }}
                onBlur={handleNpwpBlur}
                placeholder="XX.XXX.XXX.X-XXX.XXX"
                style={npwpError ? S.inputErr : S.input}
              />
              {npwpError ? (
                <span style={S.err}>{npwpError}</span>
              ) : (
                <span style={S.help}>Ketik Nomor NPWP atau NIK, tanpa spasi, simbol titik (.) atau simbol apapun (-)</span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '16px 0' }} />

          {/* Section 2 — PIC */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 8, background: '#EAF3DE', color: '#3B6D11', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              <i className="ti ti-user" />
            </div>
            PIC pertama (Penanggung jawab)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* G09 — Urutan: Nama → WA → Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={S.label}>Nama lengkap PIC *</label>
                <input value={form.pic_name} onChange={e => set('pic_name', e.target.value)} placeholder="Nama lengkap" style={S.input} />
              </div>
              {/* G10 — Label "Nomor WA PIC", G11 auto-correct */}
              <div>
                <label style={S.label}>Nomor WA PIC *</label>
                <input value={form.pic_wa} onChange={e => set('pic_wa', e.target.value)} onBlur={handleWaBlur} placeholder="628xxxxxxxxxx" style={S.input} />
                <span style={S.help}>Format: 62 + nomor. Tautan aktivasi dikirim ke nomor ini.</span>
              </div>
            </div>
            <div>
              <label style={S.label}>Email PIC *</label>
              <input type="email" value={form.pic_email} onChange={e => set('pic_email', e.target.value)} placeholder="pic@perusahaan.com" style={S.input} />
              <span style={S.help}>Email personal PIC — berbeda dari email resmi perusahaan.</span>
            </div>
          </div>

          {/* G13 — Info box */}
          <div style={{ background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#6b7280', marginTop: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <i className="ti ti-info-circle" style={{ fontSize: 16, color: '#185FA5', flexShrink: 0, marginTop: 1 }} />
            <div>
              Setelah disimpan, sistem akan otomatis membuat akun untuk PIC dan mengirim
              {' '}<strong>tautan aktivasi</strong> via WA. Tenant aktif setelah PIC mengklik tautan
              tersebut dan SuperAdmin mengaktifkan secara manual.
            </div>
          </div>

          {error && (
            <div style={{ background: '#FCEBEB', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#F09595', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#A32D2D', marginTop: 12 }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f9f9f8' }}>
          <button
            onClick={handleClose}
            disabled={saving}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', color: '#1a1a1a', background: 'transparent' }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: !canSubmit || saving ? 'not-allowed' : 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB', opacity: !canSubmit || saving ? 0.5 : 1 }}
          >
            <i className="ti ti-device-floppy" />
            {saving ? 'Menyimpan…' : 'Simpan & Kirim Tautan Aktivasi'}
          </button>
        </div>
      </div>
    </div>
  )
}
