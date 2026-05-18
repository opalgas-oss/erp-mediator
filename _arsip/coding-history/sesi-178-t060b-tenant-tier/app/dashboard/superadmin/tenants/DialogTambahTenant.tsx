// app/dashboard/superadmin/tenants/DialogTambahTenant.tsx — PRE-FIX T-060b S#178
// Snapshot sebelum: tambah tierOpsi prop + tier select field di form
// Form tidak ada field tier — SA tidak bisa pilih paket tenant saat create, selalu default 'starter'
// Dibuat: Sesi #132. Diupdate: Sesi #141, Sesi #149.
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { BuatTenantPayload, TenantTipe } from '@/lib/types/tenant.types'
import { autoCorrectWA } from '@/lib/utils-client'

interface Props { open: boolean; onClose: () => void; onSuccess: () => void }

// PRE-FIX: INIT tidak punya tier — selalu pakai default DB ('starter')
const INIT: BuatTenantPayload = {
  nama_brand: '', nama_legal: '', slug: '',
  tipe: 'eksternal', npwp: '',
  pic_name: '', pic_email: '', pic_wa: '',
}

function toSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 50)
}
function validateNPWP(s: string): { ok: boolean; msg?: string } {
  const clean = s.trim()
  if (!clean) return { ok: false, msg: 'NPWP wajib diisi' }
  const digits = clean.replace(/\D/g, '')
  if (digits.length < 5) return { ok: false, msg: 'NPWP tidak valid' }
  return { ok: true }
}

const S = {
  input: { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
  inputErr: { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: '#A32D2D', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
  select: { fontSize: 13, padding: '8px 10px', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, width: '100%', fontFamily: 'inherit', background: '#fff' } as React.CSSProperties,
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' } as React.CSSProperties,
  help: { fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'block' } as React.CSSProperties,
  err: { fontSize: 11, color: '#A32D2D', marginTop: 2, display: 'block' } as React.CSSProperties,
}

// PRE-FIX: DialogTambahTenant tidak terima tierOpsi — tidak ada field tier di form
export function DialogTambahTenant({ open, onClose, onSuccess }: Props) {
  const [form, setForm]              = useState<BuatTenantPayload>(INIT)
  const [saving, setSaving]          = useState(false)
  const [error, setError]            = useState('')
  const [npwpError, setNpwpError]    = useState('')
  const [slugStatus, setSlugStatus]  = useState<'idle'|'checking'|'taken'|'available'>('idle')
  const set = (key: keyof BuatTenantPayload, val: string) => setForm(f => ({ ...f, [key]: val }))
  const handleNamaBrand = (val: string) => setForm(f => ({ ...f, nama_brand: val, slug: toSlug(val) }))
  const handleClose = () => { setForm(INIT); setError(''); setNpwpError(''); setSlugStatus('idle'); onClose() }

  useEffect(() => {
    if (!form.slug || form.slug.length < 3) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/superadmin/tenants/check-slug?slug=${encodeURIComponent(form.slug)}`)
        const json = await res.json()
        if (!json.available) { const base = form.slug.replace(/-\d+$/, ''); set('slug', `${base}-2`) }
        else setSlugStatus('available')
      } catch { setSlugStatus('idle') }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.slug])

  const handleNpwpBlur = () => { const v = validateNPWP(form.npwp); setNpwpError(v.ok ? '' : v.msg ?? '') }
  const handleWaBlur = () => set('pic_wa', autoCorrectWA(form.pic_wa))
  const canSubmit = !!form.nama_brand && !!form.nama_legal && !!form.slug && !!form.npwp && validateNPWP(form.npwp).ok && !!form.pic_name && !!form.pic_wa && !!form.pic_email

  const handleSubmit = async () => {
    if (!canSubmit) return; setError(''); setSaving(true)
    try {
      const res = await fetch('/api/superadmin/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSuccess(); handleClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal membuat tenant') }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px 14px', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>Tambah Tenant Baru</div><div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Isi data minimal — detail dilengkapi di halaman tenant setelah aktif</div></div>
          <button onClick={handleClose} style={{ background: 'transparent', borderWidth: 0, cursor: 'pointer', fontSize: 18, color: '#6b7280' }}><i className="ti ti-x" /></button>
        </div>
        {/* PRE-FIX: No tier field in form body */}
        {error && (<div style={{ background: '#FCEBEB', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#F09595', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#A32D2D', margin: '12px 20px 0' }}><i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}</div>)}
        <div style={{ padding: '14px 20px', borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f9f9f8' }}>
          <button onClick={handleClose} disabled={saving} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.22)', color: '#1a1a1a', background: 'transparent' }}>Batal</button>
          <button onClick={handleSubmit} disabled={!canSubmit || saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: !canSubmit || saving ? 'not-allowed' : 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB', opacity: !canSubmit || saving ? 0.5 : 1 }}>
            <i className="ti ti-device-floppy" />{saving ? 'Menyimpan…' : 'Simpan & Kirim Tautan Aktivasi'}
          </button>
        </div>
      </div>
    </div>
  )
}
