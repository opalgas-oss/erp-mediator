'use client'

// app/dashboard/superadmin/tenants/[id]/_shared/tenant-tab-ui.tsx
// Shared UI components untuk semua tab Manajemen Tenant SA.
//
// Dibuat: Sesi #315 — H-DRY-TENANT-TABS (refactor duplikasi seluruh tab)
//
// Ekspor:
//   Accordion  — card collapsible dengan chevron kanan atas (tanpa BtnEdit)
//   FRow       — layout grid 2 kolom untuk field
//   FReadOnly  — field read-only dengan label
//   FInput     — field input teks/angka editable dengan label
//   FSelect    — field select/dropdown editable dengan label
//   FTextarea  — field textarea editable dengan label (baru di shared)
//   S          — style token (card, grid2, label, input, select, help, divider)
//
// Pola chevron:
//   onClick di header div → toggle open/close seluruh card
//   onClick di ikon chevron → stopPropagation + toggle (agar tidak double-fire)
//
// Semua tab editable WAJIB pakai pola simpan terpadu (keputusan Philips S#314):
//   draft + baseline deep-clone + detectHasChanges + footer sticky + handleSave DIFF only
//   TIDAK ADA tombol Edit per-section di tab manapun.

import { useState } from 'react'

// ─── Style token ──────────────────────────────────────────────────────────────
// Konsolidasi dari S.* yang tersebar di 4 tab (TabInfoUmum, TabKategori,
// TabUserTenant, TabOverrideConfig). Gunakan S.xxx untuk konsistensi.

export const S = {
  // Wrapper card (border tipis + rounded) — dipakai untuk card yang tidak pakai Accordion
  card: {
    border: '0.5px solid rgba(0,0,0,0.12)',
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginBottom: 10,
    background: '#fff',
  } as React.CSSProperties,

  // Header card yang clickable (judul + chevron)
  cardHdr: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    cursor: 'pointer',
    background: '#fff',
    userSelect: 'none' as const,
  } as React.CSSProperties,

  // Body card (konten di dalam card)
  cardBody: {
    padding: '0 16px 16px',
    background: '#fff',
  } as React.CSSProperties,

  // Grid 2 kolom untuk field
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 20px',
    marginTop: 12,
  } as React.CSSProperties,

  // Label field
  label: {
    fontSize: 12,
    color: '#6b7280',
  } as React.CSSProperties,

  // Input teks editable
  input: {
    fontSize: 13,
    padding: '7px 10px',
    border: '0.5px solid rgba(0,0,0,0.12)',
    borderRadius: 8,
    background: '#fff',
    color: '#1a1a1a',
    width: '100%',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  // Input read-only (background abu)
  inputRO: {
    fontSize: 13,
    padding: '7px 10px',
    border: '0.5px solid rgba(0,0,0,0.12)',
    borderRadius: 8,
    background: '#f9f9f8',
    color: '#6b7280',
    width: '100%',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  // Select / dropdown editable
  select: {
    fontSize: 13,
    padding: '7px 10px',
    border: '0.5px solid rgba(0,0,0,0.12)',
    borderRadius: 8,
    background: '#fff',
    color: '#1a1a1a',
    width: '100%',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  // Teks bantuan kecil di bawah field
  help: {
    fontSize: 11,
    color: '#9ca3af',
  } as React.CSSProperties,

  // Divider horizontal tipis
  divider: {
    height: 0.5,
    background: 'rgba(0,0,0,0.12)',
    margin: '14px 0',
  } as React.CSSProperties,
} as const

// ─── Accordion ────────────────────────────────────────────────────────────────
// Card collapsible dengan chevron di kanan atas.
// Keputusan Philips S#314: SEMUA card di SEMUA tab WAJIB punya chevron ini.
// Pola: TANPA BtnEdit / rightContent — hanya chevron toggle.

export function Accordion({
  icon,
  iconBg,
  iconColor,
  title,
  defaultOpen,
  children,
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
      {/* Header — klik seluruh area toggle open/close */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', cursor: 'pointer', background: '#fff', userSelect: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
      >
        {/* Kiri: ikon + judul */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500, fontSize: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: iconBg, color: iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>
            <i className={`ti ${icon}`} />
          </div>
          {title}
        </div>

        {/* Kanan: chevron — onClick stopPropagation agar tidak double-fire */}
        <i
          className="ti ti-chevron-down"
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          style={{
            fontSize: 16, color: '#6b7280',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Body — tampil hanya saat open */}
      {open && (
        <div style={{ padding: '0 16px 16px', background: '#fff' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── FRow — layout grid 2 kolom ───────────────────────────────────────────────

export function FRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={S.grid2}>
      {children}
    </div>
  )
}

// ─── FReadOnly — field read-only ──────────────────────────────────────────────

export function FReadOnly({
  label,
  value,
  fullWidth,
  children,
}: {
  label:      string
  value?:     string | null
  fullWidth?: boolean
  children?:  React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      gridColumn: fullWidth ? '1/-1' : undefined,
    }}>
      <label style={S.label}>{label}</label>
      {children ?? (
        <input
          readOnly
          value={value ?? ''}
          style={S.inputRO}
        />
      )}
    </div>
  )
}

// ─── FInput — field input editable ───────────────────────────────────────────

export function FInput({
  label,
  value,
  onChange,
  fullWidth,
  placeholder,
  type,
  helpText,
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  fullWidth?:   boolean
  placeholder?: string
  type?:        string
  helpText?:    string
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      gridColumn: fullWidth ? '1/-1' : undefined,
    }}>
      <label style={S.label}>{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={S.input}
      />
      {helpText && <span style={S.help}>{helpText}</span>}
    </div>
  )
}

// ─── FSelect — field select/dropdown editable ─────────────────────────────────

export function FSelect({
  label,
  value,
  onChange,
  options,
  fullWidth,
}: {
  label:      string
  value:      string
  onChange:   (v: string) => void
  options:    { val: string; label: string }[]
  fullWidth?: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      gridColumn: fullWidth ? '1/-1' : undefined,
    }}>
      <label style={S.label}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={S.select}
      >
        {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── FTextarea — field textarea editable (baru di shared) ────────────────────
// Tidak ada di TabInfoUmum.helpers.tsx sebelumnya — dibuat baru untuk shared.

export function FTextarea({
  label,
  value,
  onChange,
  fullWidth,
  placeholder,
  rows,
  helpText,
  style,
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  fullWidth?:   boolean
  placeholder?: string
  rows?:        number
  helpText?:    string
  style?:       React.CSSProperties
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      gridColumn: fullWidth ? '1/-1' : undefined,
    }}>
      <label style={S.label}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 3}
        style={{
          fontSize: 13,
          padding: '7px 10px',
          border: '0.5px solid rgba(0,0,0,0.12)',
          borderRadius: 8,
          background: '#fff',
          color: '#1a1a1a',
          width: '100%',
          fontFamily: 'inherit',
          resize: 'vertical',
          ...style,
        }}
      />
      {helpText && <span style={S.help}>{helpText}</span>}
    </div>
  )
}
