'use client'

// app/dashboard/superadmin/tenants/[id]/DialogTambahAdminTenant.tsx
// Dialog Tambah AdminTenant — orchestrator state machine.
// Sub-render ada di dialog-tambah-at.parts.tsx untuk menjaga ukuran file.
// Acuan: mockup_11_b1_dialog_tambah_admintenant_v1.html (APPROVED S#232)
// Dibuat: Sesi #239 — HUTANG-AT-AUTH STEP 2 Fase 2

import { useState } from 'react'
import { DS, JABATAN_OPTIONS, RELASI_OPTIONS, type DialogATState, type FormDataAT, type ExistingInfoAT, type JabatanAT, type RelasiAT } from './dialog-tambah-at.constants'
import { BodyForm, BodyLoading, BodyExisting, BodySukses } from './dialog-tambah-at.parts'

interface Props { tenantId: string; tenantNama: string; onClose: () => void; onSuccess: () => void }

function validate(form: FormDataAT) {
  const e: Partial<Record<keyof FormDataAT, string>> = {}
  if (!form.nama.trim()) e.nama = 'Nama wajib diisi'
  if (!form.email.trim()) e.email = 'Email wajib diisi'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format email tidak valid'
  if (!form.nomor_wa.trim()) e.nomor_wa = 'Nomor WA wajib diisi'
  else if (!/^62\d+$/.test(form.nomor_wa.replace(/\D/g, ''))) e.nomor_wa = 'Harus diawali 62'
  if (!form.jabatan) e.jabatan = 'Jabatan wajib dipilih'
  if (!form.relasi)  e.relasi  = 'Relasi wajib dipilih'
  return e
}

export function DialogTambahAdminTenant({ tenantId, tenantNama, onClose, onSuccess }: Props) {
  const [state,    setState]    = useState<DialogATState>('form')
  const [form,     setForm]     = useState<FormDataAT>({ nama: '', email: '', nomor_wa: '', jabatan: '', relasi: '' })
  const [errors,   setErrors]   = useState<Partial<Record<keyof FormDataAT, string>>>({})
  const [existing, setExisting] = useState<ExistingInfoAT | null>(null)
  const [errMsg,   setErrMsg]   = useState('')
  const [mailOk,   setMailOk]   = useState(false)

  const url = `/api/superadmin/tenants/${tenantId}/admin-tenant`
  const post = (body: object) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())

  const handleSubmit = async () => {
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setState('loading')
    const cek = await post({ action: 'cek_email', email: form.email })
    if (!cek.success) { setState('error'); setErrMsg(cek.error ?? 'Gagal cek email'); return }
    const d = cek.data
    if (d.exists) {
      if (d.has_active_membership) { setState('error'); setErrMsg('Email ini sudah terdaftar sebagai Admin Tenant aktif di tenant ini.'); return }
      setExisting({ user_id: d.user_id, user_name: d.user_name, user_email: d.user_email, user_wa: d.user_wa, role_existing: d.role_existing, has_active_membership: false })
      setState('existing')
    } else {
      const res = await post({ action: 'tambah_baru', tenant_nama: tenantNama, payload: { tenant_id: tenantId, nama: form.nama.trim(), email: form.email.toLowerCase().trim(), nomor_wa: form.nomor_wa.replace(/\D/g,''), jabatan: form.jabatan, relasi_ke_perusahaan: form.relasi } })
      if (!res.success) { setState('error'); setErrMsg(res.error ?? 'Gagal simpan'); return }
      setMailOk(res.data?.emailTerkirim ?? false); setState('sukses')
    }
  }

  const handleYes = async () => {
    if (!existing) return
    setState('loading')
    const res = await post({ action: 'tambah_existing', payload: { tenant_id: tenantId, user_id: existing.user_id, jabatan: form.jabatan, relasi_ke_perusahaan: form.relasi } })
    if (!res.success) { setState('error'); setErrMsg(res.error ?? 'Gagal simpan'); return }
    setMailOk(false); setState('sukses')
  }

  const handleNo = () => { setExisting(null); setState('form') }
  const reset    = () => { setForm({ nama: '', email: '', nomor_wa: '', jabatan: '', relasi: '' }); setErrors({}); setState('form') }

  const hdrTitle = state === 'sukses' ? 'AdminTenant Ditambahkan' : state === 'existing' ? 'Email Sudah Terdaftar' : 'Tambah AdminTenant'

  return (
    <div style={DS.overlay} onClick={e => { if (e.target === e.currentTarget && state !== 'loading') onClose() }}>
      <div style={DS.modal}>
        {/* Header */}
        <div style={DS.hdr}>
          <div><div style={{ fontSize: 16, fontWeight: 500 }}>{hdrTitle}</div><div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{tenantNama}</div></div>
          <button onClick={onClose} disabled={state === 'loading'} style={{ ...DS.btnBase('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a'), opacity: state === 'loading' ? 0.4 : 1 }}><i className="ti ti-x" /></button>
        </div>

        {/* Body */}
        <div style={DS.body}>
          {(state === 'form' || state === 'error') && <BodyForm form={form} setForm={setForm} errors={errors} errMsg={state === 'error' ? errMsg : undefined} jabatanOptions={JABATAN_OPTIONS} relasiOptions={RELASI_OPTIONS} />}
          {state === 'loading'  && <BodyLoading />}
          {state === 'existing' && existing && <BodyExisting existing={existing} />}
          {state === 'sukses'   && <BodySukses form={form} mailOk={mailOk} />}
        </div>

        {/* Footer */}
        <div style={DS.ftr}>
          {(state === 'form' || state === 'error') && <>
            <span style={{ fontSize: 11, color: '#6b7280' }}><span style={{ color: '#A32D2D' }}>*</span> wajib diisi</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={DS.btnBase('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a')}>Batal</button>
              <button onClick={handleSubmit} style={DS.btnBase('0.5px solid #85B7EB', '#185FA5')}><i className="ti ti-device-floppy" /> Simpan &amp; Kirim Aktivasi</button>
            </div>
          </>}
          {state === 'loading'  && <><span /><button disabled style={{ ...DS.btnBase('0.5px solid rgba(0,0,0,0.22)', '#6b7280'), opacity: 0.4 }}>Memproses...</button></>}
          {state === 'existing' && <>
            <button onClick={handleNo}  style={DS.btnBase('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a')}><i className="ti ti-arrow-left" /> Tidak, Kembali</button>
            <button onClick={handleYes} style={DS.btnBase('0.5px solid #85B7EB', '#185FA5')}><i className="ti ti-check" /> Ya, Tambahkan</button>
          </>}
          {state === 'sukses' && <>
            <button onClick={reset}                       style={DS.btnBase('0.5px solid #85B7EB', '#185FA5')}><i className="ti ti-user-plus" /> Tambah Lagi</button>
            <button onClick={() => { onSuccess(); onClose() }} style={DS.btnBase('0.5px solid #97C459', '#3B6D11')}><i className="ti ti-check" /> Selesai</button>
          </>}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
