'use client'

// app/dashboard/superadmin/tenants/[id]/TabInfoUmum.helpers.tsx
// Sub-komponen untuk TabInfoUmum: Accordion, field helpers, LifecycleViz
//
// Dibuat: Sesi #312 — split dari TabInfoUmum.tsx (32.8 KB → pecah by kategori ATURAN 9)
// Pola lama (editingCluster per-cluster) DIHAPUS — ganti pola simpan terpadu S#312

import { useState }   from 'react'
import type { Tenant } from '@/lib/types/tenant.types'

// ─── Tipe draft (semua field yang bisa diubah) ────────────────────────────────

export interface TenantDraft {
  // Cluster A
  nama_brand:          string
  nama_legal:          string
  // Cluster B
  npwp:                string
  nib:                 string
  status_pkp:          string
  bentuk_badan_usaha:  string
  kbli_utama:          string
  kbli_sekunder:       string
  // Cluster C
  alamat:              string
  provinsi:            string
  kota:                string
  kecamatan:           string
  kode_pos:            string
  email_resmi:         string
  nomor_wa_bisnis:     string
  // Cluster D
  tipe:                string
  tier:                string
  refund_auto_approve: boolean
  // Cluster F
  timezone:            string
  bahasa:              string
  catatan_internal:    string
  warna_utama:         string
  warna_aksen:         string
}

// ─── Helper: build draft awal dari data tenant ────────────────────────────────

export function buildDraft(t: Tenant): TenantDraft {
  return {
    nama_brand:          t.nama_brand         ?? '',
    nama_legal:          t.nama_legal         ?? '',
    npwp:                t.npwp               ?? '',
    nib:                 t.nib                ?? '',
    status_pkp:          t.status_pkp         ?? '',
    bentuk_badan_usaha:  t.bentuk_badan_usaha ?? 'pt',
    kbli_utama:          t.kbli_utama         ?? '',
    kbli_sekunder:       t.kbli_sekunder      ?? '',
    alamat:              t.alamat             ?? '',
    provinsi:            t.provinsi           ?? '',
    kota:                t.kota               ?? '',
    kecamatan:           t.kecamatan          ?? '',
    kode_pos:            t.kode_pos           ?? '',
    email_resmi:         t.email_resmi        ?? '',
    nomor_wa_bisnis:     t.nomor_wa_bisnis    ?? '',
    tipe:                t.tipe               ?? 'eksternal',
    tier:                t.tier               ?? 'starter',
    refund_auto_approve: t.refund_auto_approve ?? false,
    timezone:            t.timezone           ?? 'Asia/Jakarta',
    bahasa:              t.bahasa             ?? 'id-ID',
    catatan_internal:    t.catatan_internal   ?? '',
    warna_utama:         t.warna_utama        ?? '#185FA5',
    warna_aksen:         t.warna_aksen        ?? '#EF9F27',
  }
}

// ─── Helper: deteksi apakah draft berbeda dari baseline ───────────────────────

export function detectHasChanges(draft: TenantDraft, baseline: TenantDraft): boolean {
  return (Object.keys(draft) as (keyof TenantDraft)[]).some(
    k => String(draft[k]) !== String(baseline[k])
  )
}

// ─── Helper: build DIFF payload — hanya field yang berubah ───────────────────

export function buildDiffPayload(
  draft:    TenantDraft,
  baseline: TenantDraft,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  const keys = Object.keys(draft) as (keyof TenantDraft)[]

  for (const k of keys) {
    if (String(draft[k]) === String(baseline[k])) continue

    if (k === 'refund_auto_approve') {
      diff[k] = draft.refund_auto_approve
    } else {
      diff[k] = draft[k]
    }
  }

  return diff
}

// ─── Helper: format tanggal ───────────────────────────────────────────────────

export function formatTglLengkap(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatTglWaktu(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  const d   = new Date(isoStr)
  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${tgl}, ${jam} WIB`
}

// ─── Sub-komponen: Accordion ──────────────────────────────────────────────────
// Pola baru: hanya chevron di kanan (tanpa tombol Edit)
// Chevron punya onClick sendiri — tidak dalam stopPropagation wrapper

export function Accordion({
  icon, iconBg, iconColor, title, defaultOpen, children,
}: {
  icon:         string
  iconBg:       string
  iconColor:    string
  title:        string
  defaultOpen?: boolean
  children:     React.ReactNode
}) {
  const [open, setOpen] = useState(!!defaultOpen)

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
        {/* Chevron: onClick langsung toggle — tidak dibungkus stopPropagation */}
        <i
          className="ti ti-chevron-down"
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          style={{ fontSize: 16, color: '#6b7280', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', cursor: 'pointer' }}
        />
      </div>
      {open && (
        <div style={{ padding: '0 16px 16px', background: '#fff' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Sub-komponen: Field layout helpers ──────────────────────────────────────

export function FRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginTop: 12 }}>{children}</div>
}

export function FReadOnly({ label, value, fullWidth, children }: {
  label:      string
  value?:     string | null
  fullWidth?: boolean
  children?:  React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: fullWidth ? '1/-1' : undefined }}>
      <label style={{ fontSize: 12, color: '#6b7280' }}>{label}</label>
      {children ?? (
        <input
          readOnly
          value={value ?? ''}
          style={{ fontSize: 13, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: '#f9f9f8', color: '#6b7280', width: '100%', fontFamily: 'inherit' }}
        />
      )}
    </div>
  )
}

export function FInput({ label, value, onChange, fullWidth, placeholder, type, helpText }: {
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

export function FSelect({ label, value, onChange, options, fullWidth }: {
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
// S#305 FIX (dikembalikan): 6 tahap visual bisnis — BUKAN driven by DB constraint
// DB constraint (active|non_active|pending) = untuk operasi tombol header saja

type LCStatus = 'in_registration' | 'pending' | 'active' | 'suspended' | 'expired' | 'terminated'

const LC_STATES: { key: LCStatus; label: string; icon: string }[] = [
  { key: 'in_registration', label: 'Dalam Registrasi',  icon: 'ti-file-description' },
  { key: 'pending',         label: 'Menunggu aktivasi', icon: 'ti-hourglass'        },
  { key: 'active',          label: 'Aktif',             icon: 'ti-circle-check'     },
  { key: 'suspended',       label: 'Dinonaktifkan',     icon: 'ti-player-pause'     },
  { key: 'expired',         label: 'Kedaluwarsa',       icon: 'ti-hourglass-empty'  },
  { key: 'terminated',      label: 'Diakhiri',          icon: 'ti-circle-x'         },
]

export function LifecycleViz({
  status,
  onAktifkan,
  saving,
}: {
  status:     string
  onAktifkan: () => void
  saving:     boolean
}) {
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

      <div style={{ background: '#f9f9f8', borderLeft: '3px solid rgba(0,0,0,0.22)', padding: '8px 12px', borderRadius: '0 8px 8px 0', fontSize: 12, color: '#6b7280' }}>
        {status === 'active'     && 'Tenant aktif — AdminTenant dapat login dan operasi bisnis berjalan normal.'}
        {status === 'non_active' && 'Tenant tidak aktif — AdminTenant tidak dapat login. Klik tombol di header untuk mengaktifkan kembali.'}
        {status === 'pending'    && 'Tenant menunggu aktivasi SA — klik tombol "Aktifkan Tenant" di atas untuk mengaktifkan.'}
      </div>
    </div>
  )
}
