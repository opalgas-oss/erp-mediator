'use client'

// app/dashboard/superadmin/tenants/[id]/TabInfoUmum.tsx
// Tab Info Umum — 5 cluster accordion + lifecycle visualization 3-state
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase A
// Diupdate: Sesi #303 — UNIFIKASI STATUS (2-state, visual only) — DIBATALKAN
// Diupdate: Sesi #305 — RESTORE: kembalikan LifecycleViz ke diagram alur 6 tahap
//   Visual bisnis lifecycle (in_registration/pending/active/suspended/expired/terminated)
//   DB constraint (active|non_active|pending) = operasi tombol header, BUKAN acuan diagram.
//   S#303 mengubah ini tanpa perintah — pelanggaran LL#9 + ATURAN 7.

import { useState } from 'react'
import { toast }    from 'sonner'
import type { Tenant, UpdateTenantInfoPayload } from '@/lib/types/tenant.types'

interface Props { tenant: Tenant; onRefresh: () => void }

// ─── Tipe cluster yang bisa diedit ────────────────────────────────────────────

type ClusterId = 'A' | 'B' | 'C' | 'D' | 'F'

// ─── Helper: format tanggal ───────────────────────────────────────────────────

function formatTglLengkap(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTglWaktu(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  const d   = new Date(isoStr)
  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${tgl}, ${jam} WIB`
}

// ─── Sub-komponen: Accordion Cluster ─────────────────────────────────────────

interface AccordionProps {
  id:             ClusterId
  icon:           string
  iconBg:         string
  iconColor:      string
  title:          string
  defaultOpen?:   boolean
  editingCluster: ClusterId | null
  onEdit:         (id: ClusterId) => void
  children:       React.ReactNode
}

function Accordion({ id, icon, iconBg, iconColor, title, defaultOpen, editingCluster, onEdit, children }: AccordionProps) {
  const [open, setOpen] = useState(!!defaultOpen)
  const isEditing = editingCluster === id

  return (
    <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', background: '#fff', userSelect: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500, fontSize: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
            <i className={`ti ${icon}`} />
          </div>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, borderRadius: 8, cursor: 'pointer', border: '0.5px solid #85B7EB', color: '#185FA5', background: isEditing ? '#E6F1FB' : 'transparent' }}
          >
            <i className="ti ti-edit" /> Edit
          </button>
          <i className="ti ti-chevron-down" style={{ fontSize: 16, color: '#6b7280', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 16px 16px', background: '#fff' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Sub-komponen: Field helpers ──────────────────────────────────────────────

function FRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginTop: 12 }}>{children}</div>
}

function FField({ label, value, fullWidth, readOnly, children }: {
  label:      string
  value?:     string | null
  fullWidth?: boolean
  readOnly?:  boolean
  children?:  React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: fullWidth ? '1/-1' : undefined }}>
      <label style={{ fontSize: 12, color: '#6b7280' }}>{label}</label>
      {children ?? (
        <input
          readOnly
          value={value ?? ''}
          style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: readOnly ? '#f9f9f8' : '#fff', color: readOnly ? '#6b7280' : '#1a1a1a', width: '100%', fontFamily: 'inherit' }}
        />
      )}
    </div>
  )
}

function FInput({ label, value, onChange, fullWidth, placeholder, type, helpText }: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  fullWidth?:   boolean
  placeholder?: string
  type?:        string
  helpText?:    string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: fullWidth ? '1/-1' : undefined }}>
      <label style={{ fontSize: 12, color: '#6b7280' }}>{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', color: '#1a1a1a', width: '100%', fontFamily: 'inherit' }}
      />
      {helpText && <span style={{ fontSize: 11, color: '#9ca3af' }}>{helpText}</span>}
    </div>
  )
}

function FSelect({ label, value, onChange, options, fullWidth }: {
  label:      string
  value:      string
  onChange:   (v: string) => void
  options:    { val: string; label: string }[]
  fullWidth?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: fullWidth ? '1/-1' : undefined }}>
      <label style={{ fontSize: 12, color: '#6b7280' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', color: '#1a1a1a', width: '100%', fontFamily: 'inherit' }}
      >
        {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Lifecycle Visualization — diagram alur 6 tahap (bisnis lifecycle) ─────────
// S#305 FIX: 6 tahap visual bisnis — BUKAN driven by DB constraint
// DB constraint (active|non_active|pending) = untuk operasi tombol header saja
// Diagram ini murni visual representasi lifecycle bisnis lengkap

type LCStatus = 'in_registration' | 'pending' | 'active' | 'suspended' | 'expired' | 'terminated'

const LC_STATES: { key: LCStatus; label: string; icon: string }[] = [
  { key: 'in_registration', label: 'Dalam Registrasi',  icon: 'ti-file-description' },
  { key: 'pending',         label: 'Menunggu aktivasi', icon: 'ti-hourglass'        },
  { key: 'active',          label: 'Aktif',             icon: 'ti-circle-check'     },
  { key: 'suspended',       label: 'Dinonaktifkan',     icon: 'ti-player-pause'     },
  { key: 'expired',         label: 'Kedaluwarsa',       icon: 'ti-hourglass-empty'  },
  { key: 'terminated',      label: 'Diakhiri',          icon: 'ti-circle-x'         },
]

function LifecycleViz({
  status,
  onAktifkan,
  saving,
}: {
  status:     string
  onAktifkan: () => void
  saving:     boolean
}) {
  // Map dari DB status ke posisi visual 6-tahap
  const statusToLCKey = (s: string): LCStatus => {
    if (s === 'non_active') return 'suspended'
    if (s === 'active')     return 'active'
    if (s === 'pending')    return 'pending'
    return 'in_registration'
  }

  const currentKey = statusToLCKey(status)
  const currentIdx = LC_STATES.findIndex(s => s.key === currentKey)

  const getCircleStyle = (idx: number) => {
    if (idx < currentIdx) return { background: '#EAF3DE', border: '0.5px solid #97C459', color: '#3B6D11' }
    if (idx === currentIdx) return { background: '#185FA5', border: '0.5px solid #185FA5', color: '#fff' }
    return { background: '#f9f9f8', border: '0.5px solid rgba(0,0,0,0.12)', color: '#9ca3af' }
  }

  const getLineStyle = (idx: number) => ({
    flex: 1, height: 1,
    background: idx < currentIdx ? '#97C459' : 'rgba(0,0,0,0.12)',
  })

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Status lifecycle tenant</div>

      {/* Diagram alur 6 tahap — visual bisnis lifecycle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
        {LC_STATES.map((state, idx) => (
          <div key={state.key} style={{ display: 'contents' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, position: 'relative', zIndex: 1,
                ...getCircleStyle(idx),
              }}>
                <i className={`ti ${state.icon}`} style={{ fontSize: 14 }} />
              </div>
              <div style={{
                fontSize: 11,
                color: idx === currentIdx ? '#1a1a1a' : '#6b7280',
                fontWeight: idx === currentIdx ? 500 : 400,
                marginTop: 5, textAlign: 'center', maxWidth: 70, lineHeight: 1.3,
              }}>
                {state.label}
              </div>
            </div>
            {idx < LC_STATES.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: 14, flex: 0.5 }}>
                <div style={getLineStyle(idx)} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tombol aksi — hanya muncul saat pending */}
      {status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            onClick={onAktifkan}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 13,
              cursor: saving ? 'not-allowed' : 'pointer',
              border: '0.5px solid #97C459', color: '#3B6D11', background: 'transparent',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <i className="ti ti-circle-check" /> {saving ? 'Memproses...' : 'Aktifkan Tenant'}
          </button>
        </div>
      )}

      {/* Note */}
      <div style={{ background: '#f9f9f8', borderLeft: '3px solid rgba(0,0,0,0.22)', padding: '8px 12px', borderRadius: '0 8px 8px 0', fontSize: 12, color: '#6b7280' }}>
        {status === 'active'     && 'Tenant aktif — AdminTenant dapat login dan operasi bisnis berjalan normal.'}
        {status === 'non_active' && 'Tenant tidak aktif — AdminTenant tidak dapat login. Klik "Re Active" di header untuk mengaktifkan kembali.'}
        {status === 'pending'    && 'Tenant menunggu aktivasi SA — klik tombol "Aktifkan Tenant" di atas untuk mengaktifkan.'}
      </div>
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TabInfoUmum({ tenant, onRefresh }: Props) {
  const [editingCluster, setEditingCluster] = useState<ClusterId | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [savingStatus,   setSavingStatus]   = useState(false)
  const [form,           setForm]           = useState<Partial<UpdateTenantInfoPayload>>({})

  const handleOpenEdit = (id: ClusterId) => { setForm({}); setEditingCluster(id) }
  const handleCancel   = () => { setEditingCluster(null); setForm({}) }
  const set = (k: keyof UpdateTenantInfoPayload, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Perubahan berhasil disimpan')
      setEditingCluster(null)
      setForm({})
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  // Aktifkan Tenant: pending → active
  const handleAktifkan = async () => {
    setSavingStatus(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'active', alasan: 'Diaktifkan oleh SuperAdmin' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      toast.success('Tenant berhasil diaktifkan')
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengaktifkan tenant')
    } finally {
      setSavingStatus(false)
    }
  }

  const isEditA = editingCluster === 'A'
  const isEditB = editingCluster === 'B'
  const isEditC = editingCluster === 'C'
  const isEditD = editingCluster === 'D'
  const isEditF = editingCluster === 'F'

  return (
    <div>

      {/* ── Cluster A: Identitas master ──────────────────────────────────────── */}
      <Accordion id="A" icon="ti-id-badge" iconBg="#E6F1FB" iconColor="#185FA5"
        title="Cluster A — Identitas master" defaultOpen editingCluster={editingCluster} onEdit={handleOpenEdit}
      >
        <FRow>
          {isEditA ? (
            <>
              <FInput label="Nama brand *"            value={form.nama_brand ?? tenant.nama_brand}      onChange={v => set('nama_brand', v)} />
              <FInput label="Nama legal perusahaan *" value={form.nama_legal ?? tenant.nama_legal ?? ''} onChange={v => set('nama_legal', v)} />
            </>
          ) : (
            <>
              <FField label="Nama brand"            value={tenant.nama_brand} />
              <FField label="Nama legal perusahaan" value={tenant.nama_legal} />
            </>
          )}
          <FField label="Kode tenant" value={tenant.slug ?? ''} readOnly>
            <input readOnly value={tenant.slug ?? ''} style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#f9f9f8', color: '#6b7280', width: '100%', fontFamily: 'inherit' }} />
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-lock" /> Tidak bisa diubah setelah aktif
            </span>
          </FField>
          <FField label="ID sistem"          value={tenant.tenant_display_id} readOnly />
          <FField label="Tanggal bergabung"  value={formatTglLengkap(tenant.created_at)} readOnly />
          <FField label="Aktivitas terakhir" value={formatTglWaktu(tenant.updated_at)} readOnly />
        </FRow>
      </Accordion>

      {/* ── Cluster B: Legalitas Indonesia ───────────────────────────────────── */}
      <Accordion id="B" icon="ti-file-certificate" iconBg="#EAF3DE" iconColor="#3B6D11"
        title="Cluster B — Legalitas Indonesia" defaultOpen editingCluster={editingCluster} onEdit={handleOpenEdit}
      >
        <FRow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: '#6b7280' }}>NPWP perusahaan *</label>
            {isEditB
              ? <input value={form.npwp ?? tenant.npwp ?? ''} onChange={e => set('npwp', e.target.value)} style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', width: '100%', fontFamily: 'inherit' }} />
              : <input readOnly value={tenant.npwp ?? ''} style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#f9f9f8', color: '#6b7280', width: '100%', fontFamily: 'inherit' }} />
            }
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className="ti ti-check" style={{ color: '#3B6D11' }} /> Format valid</span>
              <button onClick={() => window.open('https://ereg.pajak.go.id', '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.22)', borderRadius: 8, cursor: 'pointer', color: '#185FA5', background: 'transparent' }}>
                <i className="ti ti-external-link" style={{ fontSize: 12 }} /> Verifikasi di Coretax
              </button>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: '#6b7280' }}>NIB (Nomor Induk Berusaha)</label>
            {isEditB
              ? <input value={form.nib ?? tenant.nib ?? ''} onChange={e => set('nib', e.target.value)} style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#fff', width: '100%', fontFamily: 'inherit' }} />
              : <input readOnly value={tenant.nib ?? ''} style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#f9f9f8', color: '#6b7280', width: '100%', fontFamily: 'inherit' }} />
            }
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>13 digit</span>
              <button onClick={() => window.open('https://oss.go.id', '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.22)', borderRadius: 8, cursor: 'pointer', color: '#185FA5', background: 'transparent' }}>
                <i className="ti ti-external-link" style={{ fontSize: 12 }} /> Verifikasi di OSS
              </button>
            </span>
          </div>

          {isEditB ? (
            <FSelect label="Status PKP" value={form.status_pkp ?? tenant.status_pkp ?? ''} onChange={v => set('status_pkp', v)} options={[
              { val: '',        label: '— Belum diisi —' },
              { val: 'pkp',     label: 'PKP — e-Faktur terbit otomatis tiap akhir bulan' },
              { val: 'non_pkp', label: 'Non-PKP — tidak kena PPN e-Faktur' },
            ]} />
          ) : (
            <FField label="Status PKP" value={
              tenant.status_pkp === 'pkp'     ? 'PKP — e-Faktur terbit otomatis tiap akhir bulan' :
              tenant.status_pkp === 'non_pkp' ? 'Non-PKP — tidak kena PPN e-Faktur' :
              'Belum diisi'
            } />
          )}

          {isEditB ? (
            <FSelect label="Bentuk badan usaha *" value={form.bentuk_badan_usaha ?? tenant.bentuk_badan_usaha ?? 'pt'} onChange={v => set('bentuk_badan_usaha', v)} options={[
              { val: 'pt',              label: 'PT (Perseroan Terbatas)' },
              { val: 'cv',              label: 'CV' },
              { val: 'perorangan_umkm', label: 'Perorangan / UMKM' },
              { val: 'yayasan',         label: 'Yayasan' },
              { val: 'koperasi',        label: 'Koperasi' },
            ]} />
          ) : (
            <FField label="Bentuk badan usaha" value={tenant.bentuk_badan_usaha?.replace('_', ' / ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—'} />
          )}

          {isEditB ? (
            <FInput label="KBLI utama" value={form.kbli_utama ?? tenant.kbli_utama ?? ''} onChange={v => set('kbli_utama', v)} placeholder="Contoh: 45201 — Reparasi Mobil" />
          ) : (
            <FField label="KBLI utama" value={tenant.kbli_utama ?? '—'} />
          )}

          {isEditB ? (
            <FInput label="KBLI sekunder (opsional)" value={form.kbli_sekunder ?? tenant.kbli_sekunder ?? ''} onChange={v => set('kbli_sekunder', v)} placeholder="Opsional" />
          ) : (
            <FField label="KBLI sekunder" value={tenant.kbli_sekunder ?? '—'} />
          )}
        </FRow>
      </Accordion>

      {/* ── Cluster C: Kontak & Domisili ──────────────────────────────────────── */}
      <Accordion id="C" icon="ti-map-pin" iconBg="#EEEDFE" iconColor="#534AB7"
        title="Cluster C — Kontak & domisili" editingCluster={editingCluster} onEdit={handleOpenEdit}
      >
        <FRow>
          {isEditC ? (
            <FInput label="Alamat operasional *" value={form.alamat ?? tenant.alamat ?? ''} onChange={v => set('alamat', v)} fullWidth />
          ) : (
            <FField label="Alamat operasional" value={tenant.alamat} fullWidth />
          )}

          {isEditC ? (
            <FSelect label="Provinsi" value={form.provinsi ?? tenant.provinsi ?? ''} onChange={v => set('provinsi', v)} options={[
              { val: '',             label: '— Pilih provinsi —' },
              { val: 'DKI Jakarta',  label: 'DKI Jakarta' },
              { val: 'Jawa Barat',   label: 'Jawa Barat' },
              { val: 'Jawa Tengah',  label: 'Jawa Tengah' },
              { val: 'Jawa Timur',   label: 'Jawa Timur' },
              { val: 'Banten',       label: 'Banten' },
              { val: 'Bali',         label: 'Bali' },
            ]} />
          ) : (
            <FField label="Provinsi" value={tenant.provinsi} />
          )}

          {isEditC ? (
            <FInput label="Kota / Kabupaten" value={form.kota ?? tenant.kota ?? ''} onChange={v => set('kota', v)} placeholder="Isi kota setelah pilih provinsi" />
          ) : (
            <FField label="Kota / Kabupaten" value={tenant.kota} />
          )}

          {isEditC ? (
            <FInput label="Kecamatan" value={form.kecamatan ?? tenant.kecamatan ?? ''} onChange={v => set('kecamatan', v)} />
          ) : (
            <FField label="Kecamatan" value={tenant.kecamatan ?? '—'} />
          )}

          {isEditC ? (
            <FInput label="Kode pos" value={form.kode_pos ?? tenant.kode_pos ?? ''} onChange={v => set('kode_pos', v.replace(/\D/g, '').slice(0, 5))} placeholder="5 digit" />
          ) : (
            <FField label="Kode pos" value={tenant.kode_pos ?? '—'} />
          )}

          {isEditC ? (
            <FInput label="Email resmi tenant" value={form.email_resmi ?? tenant.email_resmi ?? ''} onChange={v => set('email_resmi', v)} type="email" />
          ) : (
            <FField label="Email resmi tenant" value={tenant.email_resmi} />
          )}

          {isEditC ? (
            <FInput label="Nomor WA bisnis *" value={form.nomor_wa_bisnis ?? tenant.nomor_wa_bisnis ?? ''} onChange={v => set('nomor_wa_bisnis', v)} helpText="Format: 62 + nomor tanpa angka 0 depan" />
          ) : (
            <FField label="Nomor WA bisnis" value={tenant.nomor_wa_bisnis} />
          )}
        </FRow>
      </Accordion>

      {/* ── Cluster D: Klasifikasi internal ───────────────────────────────────── */}
      <Accordion id="D" icon="ti-adjustments" iconBg="#FAEEDA" iconColor="#854F0B"
        title="Cluster D — Klasifikasi internal platform" editingCluster={editingCluster} onEdit={handleOpenEdit}
      >
        <FRow>
          {isEditD ? (
            <FSelect label="Tipe tenant *" value={form.tipe ?? tenant.tipe ?? 'eksternal'} onChange={v => set('tipe', v)} options={[
              { val: 'internal',  label: 'Internal — dioperasikan platform sendiri' },
              { val: 'eksternal', label: 'Eksternal — disewakan ke pihak ketiga' },
            ]} />
          ) : (
            <FField label="Tipe tenant" value={tenant.tipe === 'internal' ? 'Internal — dioperasikan platform sendiri' : 'Eksternal — disewakan ke pihak ketiga'} />
          )}

          {isEditD ? (
            <FSelect label="Tier / Paket" value={form.tier ?? tenant.tier} onChange={v => set('tier', v)} options={[
              { val: 'starter',    label: 'Starter (maks. 5 user)' },
              { val: 'growth',     label: 'Growth (maks. 15 user)' },
              { val: 'enterprise', label: 'Enterprise (tidak terbatas)' },
            ]} />
          ) : (
            <FField label="Tier / Paket" value={{ starter: 'Starter (maks. 5 user)', growth: 'Growth (maks. 15 user)', enterprise: 'Enterprise (tidak terbatas)' }[tenant.tier]} />
          )}

          {(form.tipe ?? tenant.tipe) === 'internal' && (
            isEditD ? (
              <FSelect label="Persetujuan refund otomatis" value={form.refund_auto_approve !== undefined ? String(form.refund_auto_approve) : String(tenant.refund_auto_approve)} onChange={v => set('refund_auto_approve', v === 'true')} options={[
                { val: 'true',  label: 'Ya — refund langsung diproses' },
                { val: 'false', label: 'Tidak — refund eskalasi ke SuperAdmin' },
              ]} />
            ) : (
              <FField label="Persetujuan refund otomatis" value={tenant.refund_auto_approve ? 'Ya — refund langsung diproses' : 'Tidak — refund eskalasi ke SuperAdmin'} />
            )
          )}

          {isEditD ? (
            <FInput label="Region / area coverage" value={form.region_coverage ?? tenant.region_coverage ?? ''} onChange={v => set('region_coverage', v)} helpText="Opsional. Kosong = seluruh Indonesia" />
          ) : (
            <FField label="Region / area coverage" value={tenant.region_coverage ?? '—'} />
          )}

          {isEditD ? (
            <FInput label="Tags / label internal (opsional)" value={(form.tags ?? tenant.tags ?? []).join(', ')} onChange={v => set('tags', v.split(',').map(t => t.trim()).filter(Boolean) as unknown as string)} fullWidth placeholder="Contoh: jabodetabek-coverage, pilot-tenant" helpText="Opsional. Tidak terlihat AdminTenant" />
          ) : (
            <FField label="Tags / label internal" value={(tenant.tags ?? []).join(', ') || '—'} fullWidth />
          )}
        </FRow>
      </Accordion>

      {/* ── Status Lifecycle — diagram alur 3-state (S#305 RESTORE) ──────────── */}
      <LifecycleViz
        status={tenant.lifecycle_status}
        onAktifkan={handleAktifkan}
        saving={savingStatus}
      />

      {/* ── Cluster F: Pengaturan tambahan & catatan internal ─────────────────── */}
      <Accordion id="F" icon="ti-settings-2" iconBg="#F1EFE8" iconColor="#5F5E5A"
        title="Pengaturan tambahan & catatan internal" editingCluster={editingCluster} onEdit={handleOpenEdit}
      >
        <FRow>
          {isEditF ? (
            <FSelect label="Zona waktu" value={form.timezone ?? tenant.timezone ?? 'Asia/Jakarta'} onChange={v => set('timezone', v)} options={[
              { val: 'Asia/Jakarta',  label: 'Asia/Jakarta (WIB, UTC+7)' },
              { val: 'Asia/Makassar', label: 'Asia/Makassar (WITA, UTC+8)' },
              { val: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT, UTC+9)' },
            ]} />
          ) : (
            <FField label="Zona waktu" value={{ 'Asia/Jakarta': 'Asia/Jakarta (WIB, UTC+7)', 'Asia/Makassar': 'Asia/Makassar (WITA, UTC+8)', 'Asia/Jayapura': 'Asia/Jayapura (WIT, UTC+9)' }[tenant.timezone] ?? tenant.timezone} />
          )}

          {isEditF ? (
            <FSelect label="Bahasa antarmuka default" value={form.bahasa ?? tenant.bahasa ?? 'id-ID'} onChange={v => set('bahasa', v)} options={[
              { val: 'id-ID', label: 'Bahasa Indonesia (id-ID)' },
            ]} />
          ) : (
            <FField label="Bahasa antarmuka default" value="Bahasa Indonesia (id-ID)" />
          )}
        </FRow>

        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.12)', margin: '14px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-lock" style={{ color: '#854F0B' }} />
            Catatan internal SuperAdmin
            <span style={{ fontSize: 11, color: '#854F0B', marginLeft: 4 }}>(tidak terlihat AdminTenant)</span>
          </label>
          {isEditF ? (
            <textarea
              value={form.catatan_internal ?? tenant.catatan_internal ?? ''}
              onChange={e => set('catatan_internal', e.target.value)}
              style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#633806', minHeight: 80, resize: 'vertical', width: '100%', fontFamily: 'inherit' }}
            />
          ) : (
            <div style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#633806', minHeight: 40 }}>
              {tenant.catatan_internal || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Belum ada catatan</span>}
            </div>
          )}
        </div>

        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.12)', margin: '14px 0' }} />

        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 10 }}>Branding whitelabel (opsional)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px 16px' }}>
          {[
            { label: 'Warna utama',  key: 'warna_utama'  as const, default: '#185FA5' },
            { label: 'Warna aksen',  key: 'warna_aksen'  as const, default: '#EF9F27' },
          ].map(({ label, key, default: def }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#6b7280' }}>{label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.12)', background: (form[key] ?? tenant[key] ?? def) as string, flexShrink: 0 }} />
                <input value={(form[key] ?? tenant[key] ?? def) as string} onChange={e => set(key, e.target.value)} readOnly={!isEditF} style={{ flex: 1, fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: isEditF ? '#fff' : '#f9f9f8', fontFamily: 'inherit' }} />
              </div>
            </div>
          ))}
          {['Logo (light bg)', 'Logo (dark bg)'].map(label => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#6b7280' }}>{label}</label>
              <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '5px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.22)', background: 'transparent', cursor: isEditF ? 'pointer' : 'default' }}>
                <i className="ti ti-upload" /> Upload PNG
              </button>
            </div>
          ))}
        </div>
      </Accordion>

      {/* ── Footer: tombol simpan per-cluster ─────────────────────────────────── */}
      {editingCluster !== null && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
          <button onClick={handleCancel} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid rgba(0,0,0,0.22)', color: '#1a1a1a', background: 'transparent' }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid #85B7EB', color: '#185FA5', background: '#E6F1FB' }}>
            <i className="ti ti-device-floppy" /> {saving ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </div>
      )}
    </div>
  )
}
