'use client'

// app/dashboard/superadmin/tenants/[id]/DialogKelolaAksesAdminTenant.tsx
// Dialog Kelola Akses AT (Mockup B4 v2 APPROVED S#242) - 2 tab: Edit Profil + Kelola Akses.
// BUG-032 FIX S#242: tambah Tab Edit Profil (nama + email K-29 + WA)
// State loading/sukses di dialog-kelola-akses-at.parts.tsx
// Constants di dialog-kelola-akses-at.constants.ts
// Dibuat: Sesi #240 - HUTANG-AT-AUTH STEP 2 Fase 2
// Update: Sesi #242 - BUG-032 fix: 2 tab B4 v2
//
// K-21: 4 alasan cabut (resign/mutasi/kontrak_berakhir/lainnya)
// K-22: tidak ada alert SA saat AT dicabut
// K-29: email AT editable - perubahan email kirim ulang tautan aktivasi
// Skenario C-3 Lapis 1: checklist area sebagai placeholder (data dari AREA_PLACEHOLDER)

import { useState } from 'react'
import type { AdminTenantKartu } from '@/lib/types/admin-tenant.types'
import {
  DB4, JABATAN_LABEL, ALASAN_OPTIONS, AREA_PLACEHOLDER,
  type DialogKelolaState, type DialogKelolaTab, type AlasanCabut, type AreaAkses,
} from './dialog-kelola-akses-at.constants'
import { BodySuksesAtur, BodySuksesInactive, AreaChecklist } from './dialog-kelola-akses-at.parts'

interface Props {
  tenantId:   string
  tenantNama: string
  at:         AdminTenantKartu
  onClose:    () => void
  onSuccess:  () => void
}

export function DialogKelolaAksesAdminTenant({ tenantId, tenantNama, at, onClose, onSuccess }: Props) {
  const [state,      setState]      = useState<DialogKelolaState>('default')
  const [tab,        setTab]        = useState<DialogKelolaTab>('akses')
  const [inactiveOn, setInactiveOn] = useState(false)
  const [alasan,     setAlasan]     = useState<AlasanCabut | ''>('')
  const [areas,      setAreas]      = useState<AreaAkses[]>(AREA_PLACEHOLDER)
  const [alasanErr,  setAlasanErr]  = useState(false)
  // Tab Edit Profil state
  const [namaDraft,  setNamaDraft]  = useState(at.user_name ?? '')
  const [emailDraft, setEmailDraft] = useState(at.user_email ?? '')
  const [waDraft,    setWaDraft]    = useState(at.user_wa ?? '')

  const inisial      = (at.user_name ?? 'U').substring(0, 2).toUpperCase()
  const jabatanLabel = JABATAN_LABEL[at.jabatan ?? ''] ?? at.jabatan ?? '-'
  const handleSelesai = () => { onSuccess(); onClose() }

  const handleToggle = () => {
    const next = !inactiveOn
    setInactiveOn(next)
    if (!next) { setAlasan(''); setAlasanErr(false) }
  }

  const toggleArea = (id: string) => {
    if (inactiveOn) return
    setAreas(prev => prev.map(a => a.id === id ? { ...a, checked: !a.checked } : a))
  }

  // Simpan Tab Edit Profil (PATCH)
  const handleSimpanProfil = async () => {
    setState('loading')
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/admin-tenant`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          history_id: at.id,
          user_name:  namaDraft.trim(),
          user_wa:    waDraft.trim() || null,
          email:      emailDraft.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setState('sukses-atur')
    } catch { setState('default') }
  }

  // Simpan Tab Kelola Akses
  const handleSimpanAkses = async () => {
    if (inactiveOn) {
      if (!alasan) { setAlasanErr(true); return }
      setState('loading')
      try {
        const res  = await fetch(`/api/superadmin/tenants/${tenantId}/admin-tenant`, {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ history_id: at.id, alasan, tenant_id: tenantId }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        setState('sukses-inactive')
      } catch { setState('default') }
    } else {
      setState('loading')
      await new Promise(r => setTimeout(r, 600))
      setState('sukses-atur')
    }
  }

  // State: Loading
  if (state === 'loading') return (
    <div style={DB4.overlay}>
      <div style={DB4.modal}>
        <div style={DB4.hdr}>
          <div><div style={{ fontSize: 15, fontWeight: 500 }}>Kelola Akses AdminTenant</div><div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{tenantNama}</div></div>
          <button disabled style={{ ...DB4.btnSm('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a'), opacity: 0.4 }}><i className="ti ti-x" /></button>
        </div>
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E6F1FB', borderTopColor: '#185FA5', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Memproses perubahan...</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Harap tunggu sebentar.</div>
        </div>
        <div style={DB4.ftr}><span /><button disabled style={{ ...DB4.btnSm('0.5px solid rgba(0,0,0,0.22)', '#6b7280'), opacity: 0.4 }}>Batal</button></div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (state === 'sukses-atur')
    return <BodySuksesAtur tenantNama={tenantNama} at={at} areas={areas} onSelesai={handleSelesai} />

  if (state === 'sukses-inactive')
    return <BodySuksesInactive tenantNama={tenantNama} at={at} alasan={alasan} onSelesai={handleSelesai} />

  // State: Default (2 tab)

  return (
    <div style={DB4.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={DB4.modal}>
        {/* Header */}
        <div style={DB4.hdr}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Kelola Akses AdminTenant</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{tenantNama} - {at.user_name}</div>
          </div>
          <button onClick={onClose} style={DB4.btnSm('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a')}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Tab bar */}
        <div style={DB4.tabBar}>
          <button style={DB4.tabBtn(tab === 'profil')} onClick={() => setTab('profil')}>
            <i className="ti ti-user" style={{ fontSize: 12 }} /> Edit Profil
          </button>
          <button style={DB4.tabBtn(tab === 'akses')} onClick={() => setTab('akses')}>
            <i className="ti ti-shield-check" style={{ fontSize: 12 }} /> Kelola Akses
          </button>
        </div>

        {/* Body */}
        <div style={DB4.body}>

          {/* Tab: Edit Profil */}
          {tab === 'profil' && (
            <>
              <div style={DB4.formGrp}>
                <label style={DB4.formLbl}>Nama Lengkap</label>
                <input
                  style={DB4.formInput}
                  type="text"
                  value={namaDraft}
                  onChange={e => setNamaDraft(e.target.value)}
                />
              </div>
              <div style={DB4.formGrp}>
                <label style={DB4.formLbl}>Email</label>
                <input
                  style={DB4.formInput}
                  type="email"
                  value={emailDraft}
                  onChange={e => setEmailDraft(e.target.value)}
                />
                <span style={DB4.formHint}>
                  <i className="ti ti-info-circle" style={{ fontSize: 11, marginTop: 1, flexShrink: 0 }} />
                  Perubahan email akan mengirim ulang tautan aktivasi ke alamat baru.
                </span>
              </div>
              <div style={DB4.formGrp}>
                <label style={DB4.formLbl}>Nomor WhatsApp</label>
                <input
                  style={DB4.formInput}
                  type="text"
                  value={waDraft}
                  onChange={e => setWaDraft(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Tab: Kelola Akses */}
          {tab === 'akses' && (
            <>
              {/* AT card */}
              <div style={DB4.atCard(inactiveOn)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={DB4.atAv(inactiveOn)}>{inisial}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{at.user_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{at.user_email}</div>
                  </div>
                  <span style={DB4.chip('#E6F1FB', '#185FA5', '#85B7EB')}>{jabatanLabel}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px', fontSize: 12 }}>
                  <div>
                    <div style={{ color: '#6b7280' }}>Status</div>
                    <div style={{ fontWeight: 500, marginTop: 1 }}>
                      <span style={DB4.chip('#EAF3DE', '#3B6D11', '#97C459')}>
                        <i className="ti ti-circle-filled" style={{ fontSize: 7 }} /> Aktif
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280' }}>Menjabat sejak</div>
                    <div style={{ fontWeight: 500, marginTop: 1 }}>
                      {new Date(at.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inactive toggle */}
              <div style={DB4.secLbl}>
                <div style={DB4.secIcon('#FCEBEB', '#A32D2D')}><i className="ti ti-user-off" /></div>
                Nonaktifkan Admin
              </div>
              <div style={DB4.toggleRow(inactiveOn)}>
                <div style={{ flexShrink: 0, marginTop: 1 }}>
                  <div style={DB4.toggleEl(inactiveOn)} onClick={handleToggle}>
                    <div style={DB4.toggleKnob(inactiveOn)} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: inactiveOn ? '#A32D2D' : '#1a1a1a' }}>Inactive</div>
                  <div style={{ fontSize: 11, color: inactiveOn ? '#A32D2D' : '#6b7280', lineHeight: 1.5, marginTop: 4 }}>
                    Jika diaktifkan, Admin tidak akan bisa mengakses semua fitur dari Perusahaan Anda.
                  </div>
                </div>
              </div>

              {/* Alasan dropdown */}
              {inactiveOn && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      Alasan penonaktifan <span style={{ color: '#A32D2D', fontSize: 11 }}>*</span>
                    </span>
                    <select
                      style={{ ...DB4.fv, border: alasanErr ? '0.5px solid #F09595' : '0.5px solid rgba(0,0,0,0.12)' }}
                      value={alasan}
                      onChange={e => { setAlasan(e.target.value as AlasanCabut); setAlasanErr(false) }}
                    >
                      <option value="" disabled>Pilih alasan...</option>
                      {ALASAN_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {alasanErr && <span style={{ fontSize: 11, color: '#A32D2D' }}>Alasan wajib dipilih</span>}
                  </label>
                </div>
              )}

              <div style={DB4.divider} />

              {/* Area checklist */}
              <AreaChecklist areas={areas} inactiveOn={inactiveOn} onToggle={toggleArea} atName={at.user_name ?? ''} />
            </>
          )}
        </div>

        {/* Footer - tombol beda per tab */}
        <div style={DB4.ftr}>
          <button onClick={onClose} style={DB4.btnSm('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a')}>Batal</button>
          {tab === 'profil'
            ? <button onClick={handleSimpanProfil} style={DB4.btn('0.5px solid #85B7EB', '#185FA5')}>
                <i className="ti ti-device-floppy" /> Simpan
              </button>
            : inactiveOn
              ? <button onClick={handleSimpanAkses} style={DB4.btn('0.5px solid #F09595', '#A32D2D')}>
                  <i className="ti ti-device-floppy" /> Simpan
                </button>
              : <button onClick={handleSimpanAkses} style={DB4.btn('0.5px solid #85B7EB', '#185FA5')}>
                  <i className="ti ti-device-floppy" /> Simpan
                </button>
          }
        </div>
      </div>
    </div>
  )
}
