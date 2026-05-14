'use client'

// app/dashboard/superadmin/tenants/[id]/TabPICHistory.subcomponents.tsx
// Sub-komponen Tab PIC: style helpers, Badge, PICCard, Skeleton
// Dipecah dari TabPICHistory.tsx (S#147) karena file melebihi 10 KB (ATURAN 9)
//
// Dibuat: Sesi #147 — HUTANG-02 (pecah dari TabPICHistory.tsx)

import type { PICKartu } from '@/lib/types/tenant-pic.types'

// ─── Shared style helpers ─────────────────────────────────────────────────────

export const S = {
  card:    { background: '#fff', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
  label:   { fontSize: 11, color: '#6b7280', fontWeight: 500 as const, textTransform: 'uppercase' as const, letterSpacing: 0.4 } as React.CSSProperties,
  meta:    { fontSize: 12, color: '#6b7280' } as React.CSSProperties,
  btn:     { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 as const, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid' as const, fontFamily: 'inherit', lineHeight: 1.2 } as React.CSSProperties,
}

// ─── Status badge ─────────────────────────────────────────────────────────────

export function PICBadge({ variant, label }: { variant: 'active' | 'warning' | 'empty'; label: string }) {
  const style =
    variant === 'active'  ? { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check' } :
    variant === 'warning' ? { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-alert-triangle' } :
                            { bg: '#f9f9f8', text: '#6b7280', border: 'rgba(0,0,0,0.12)', icon: 'ti-circle-dashed' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500,
      background: style.bg, color: style.text,
      borderWidth: '0.5px', borderStyle: 'solid', borderColor: style.border,
    }}>
      <i className={`ti ${style.icon}`} style={{ fontSize: 11 }} />
      {label}
    </span>
  )
}

// ─── Kartu PIC ────────────────────────────────────────────────────────────────

export interface PICCardProps {
  title:        string
  iconColor:    string
  iconBg:       string
  pic:          PICKartu | null
  emptyMessage: string
  warning?:     boolean
  // Aksi — opsional, hanya muncul di kartu PIC Cadangan
  onTambah?:    () => void
  onEdit?:      () => void
  onHapus?:     () => void
}

export function PICCard({
  title, iconColor, iconBg, pic, emptyMessage, warning,
  onTambah, onEdit, onHapus,
}: PICCardProps) {
  return (
    <div style={{
      ...S.card,
      padding: 16,
      ...(warning ? { background: '#FAEEDA', borderColor: '#EF9F27' } : {}),
    }}>
      {/* Header kartu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            <i className="ti ti-user" />
          </div>
          <span style={S.label}>{title}</span>
        </div>
        {pic
          ? <PICBadge variant="active" label="Aktif" />
          : <PICBadge variant={warning ? 'warning' : 'empty'} label={warning ? 'Tidak ada' : 'Kosong'} />}
      </div>

      {/* Konten — jika PIC ada */}
      {pic ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{pic.user_name}</div>
          {pic.jabatan && <div style={{ ...S.meta, marginBottom: 6 }}>{pic.jabatan}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {pic.user_email && (
              <div style={{ ...S.meta, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-mail" style={{ fontSize: 12 }} />
                {pic.user_email}
              </div>
            )}
            {pic.user_wa && (
              <div style={{ ...S.meta, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-brand-whatsapp" style={{ fontSize: 12 }} />
                {pic.user_wa}
              </div>
            )}
          </div>

          {/* Tombol aksi — hanya tampil jika handler tersedia (kartu cadangan) */}
          {(onEdit || onHapus) && (
            <div style={{
              display: 'flex', gap: 8, marginTop: 14, paddingTop: 12,
              borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.10)',
            }}>
              {onEdit && (
                <button
                  onClick={onEdit}
                  style={{ ...S.btn, background: '#E6F1FB', color: '#185FA5', borderColor: '#85B7EB' }}
                >
                  <i className="ti ti-pencil" style={{ fontSize: 13 }} />
                  Edit
                </button>
              )}
              {onHapus && (
                <button
                  onClick={onHapus}
                  style={{ ...S.btn, background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' }}
                >
                  <i className="ti ti-trash" style={{ fontSize: 13 }} />
                  Hapus Cadangan
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: warning ? '#854F0B' : '#9ca3af', fontStyle: 'italic' }}>
            {emptyMessage}
          </div>

          {/* Tombol Tambah — primary action, dipisah garis agar jelas sebagai tombol */}
          {onTambah && (
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTopWidth: '0.5px', borderTopStyle: 'solid',
              borderTopColor: warning ? 'rgba(239,159,39,0.45)' : 'rgba(0,0,0,0.10)',
            }}>
              <button
                onClick={onTambah}
                style={{
                  ...S.btn, width: '100%', padding: '9px 14px',
                  background: '#534AB7', color: '#fff', borderColor: '#534AB7',
                  boxShadow: '0 1px 2px rgba(83,74,183,0.25)',
                }}
              >
                <i className="ti ti-user-plus" style={{ fontSize: 14 }} />
                Tambah PIC Cadangan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

export function PICTabSkeleton() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ ...S.card, padding: 16, height: 130, background: 'linear-gradient(90deg, #f9f9f8 0%, #f3f4f6 50%, #f9f9f8 100%)' }} />
        ))}
      </div>
      <div style={{ ...S.card, height: 200, background: 'linear-gradient(90deg, #f9f9f8 0%, #f3f4f6 50%, #f9f9f8 100%)' }} />
    </div>
  )
}
