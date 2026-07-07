'use client'

// app/dashboard/superadmin/tenants/[id]/tab-kategori.tabel.tsx
// Tabel 7 kolom + kebab dropdown TabKategori (C3 — G32 G33 G34)
// Blok D: chevron collapsible pada card tabel
//
// Dibuat: Sesi #325 — Pecah TabKategori.tsx (23 KB → 3 file)
// Update: Sesi #327 — F-05: fix kolom Coverage Area — baca dari coverage_areas_detail (junction table)
//                           bukan kolom legacy coverage_areas
// Dipakai oleh: TabKategori.tsx

import type { AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'
import { StatusBadge }                   from './tab-kategori.status'
import { S }                             from './_shared/tenant-tab-ui'
import { formatDateIdShort }             from '@/lib/utils-client'

// ─── Tipe item kebab ──────────────────────────────────────────────────────────

export type KebabAction = 'override' | 'riwayat' | 'hentikan' | 'lepas'

export interface KebabItem {
  icon:     string
  label:    string
  action:   KebabAction
  color:    string
  disabled: boolean
}

export function getKebabItems(a: AssignmentDenganKategori): (KebabItem | null)[] {
  return [
    { icon: 'ti-percentage',   label: 'Edit override komisi',                                                   action: 'override',  color: '#1a1a1a', disabled: a.status !== 'active' },
    { icon: 'ti-history',      label: 'Lihat riwayat assignment',                                               action: 'riwayat',   color: '#1a1a1a', disabled: false },
    null,
    { icon: 'ti-player-pause', label: a.status === 'suspended' ? 'Aktifkan kembali' : 'Hentikan kategori ini', action: 'hentikan',  color: '#854F0B', disabled: a.status === 'revoked' },
    null,
    { icon: 'ti-x',            label: 'Lepas kategori dari tenant ini',                                         action: 'lepas',     color: '#A32D2D', disabled: a.status === 'revoked' },
  ]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  loading:      boolean
  filtered:     AssignmentDenganKategori[]
  openTabel:    boolean
  setOpenTabel: (v: boolean) => void
  openKebab:    string | null
  kebabPos:     { top: number; right: number } | null
  setOpenKebab: (id: string | null) => void
  setKebabPos:  (pos: { top: number; right: number } | null) => void
  onKebabAction: (a: AssignmentDenganKategori, action: KebabAction) => void
}

// ─── Tabel 7 kolom + Kebab ────────────────────────────────────────────────────

export function TabKategoriTabel({
  loading, filtered, openTabel, setOpenTabel,
  openKebab, kebabPos, setOpenKebab, setKebabPos, onKebabAction,
}: Props) {
  return (
    <>
      {/* Card tabel — Blok D: chevron collapsible */}
      <div style={{ ...S.card, marginBottom: '1rem' }}>
        <div
          onClick={() => setOpenTabel(!openTabel)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', userSelect: 'none', background: '#fff' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 13, color: '#1a1a1a' }}>
            <i className="ti ti-list" style={{ fontSize: 15, color: '#6b7280' }} />
            Daftar kategori
          </div>
          <i className="ti ti-chevron-down" style={{ fontSize: 15, color: '#6b7280', transform: openTabel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {openTabel && loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13, borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>Memuat data kategori…</div>
        ) : openTabel && filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-category" style={{ fontSize: 32, color: '#9ca3af', display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Belum ada kategori ditugaskan</div>
          </div>
        ) : openTabel ? (
          /* Wrapper scroll vertikal — muncul otomatis saat baris melebihi maxHeight */
          <div style={{ maxHeight: 400, overflowY: 'auto', borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#f9f9f8' }}>
                  {['Kategori', 'Status', 'Komisi', 'Coverage area', 'SLA respon', 'Ditugaskan', ''].map((h, i) => (
                    <th key={i} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left', background: '#f9f9f8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a: AssignmentDenganKategori) => (
                  <tr key={a.id}
                    style={{ borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    {/* Kolom Kategori — breadcrumb + meta (G33) */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, flexWrap: 'wrap' }}>
                        {a.kategori.parent_name ? (
                          <>
                            <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{a.kategori.parent_name}</span>
                            <i className="ti ti-chevron-right" style={{ fontSize: 10, color: '#9ca3af' }} />
                            <span style={{ color: '#6b7280' }}>{a.kategori.display_name}</span>
                          </>
                        ) : (
                          <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{a.kategori.display_name}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                        {a.kategori.level === 1 ? 'Root kategori' : 'Sub-kategori'}
                        {' · '}{formatDateIdShort(a.assigned_at)}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                      <StatusBadge status={a.status} />
                    </td>

                    {/* Komisi */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                      {a.commission_override ? (
                        <span style={{ background: '#EEEDFE', color: '#534AB7', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#AFA9EC', borderRadius: 100, padding: '2px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-edit" style={{ fontSize: 10 }} />
                          Override: {a.commission_override}%
                        </span>
                      ) : (
                        <span style={{ background: '#f9f9f8', color: '#6b7280', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 100, padding: '2px 7px', fontSize: 11, display: 'inline-block' }}>
                          {a.tampil_komisi ?? 'Ikut kontrak'}
                        </span>
                      )}
                    </td>

                    {/* Coverage area — S#327 F-05: baca dari coverage_areas_detail (junction table) */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                      {a.coverage_areas_detail.length > 0 ? (
                        a.coverage_areas_detail.map((area, idx) => {
                          const label = area.city_name ?? area.province_name
                          return (
                            <span key={idx} style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 100, fontSize: 11, background: '#E6F1FB', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', marginRight: 2, marginBottom: 2 }}>{label}</span>
                          )
                        })
                      ) : (
                        <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 100, fontSize: 11, background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', color: '#9ca3af' }}>Seluruh Indonesia</span>
                      )}
                    </td>

                    {/* SLA respon */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'middle', fontSize: 12, color: '#6b7280' }}>
                      {a.sla_minutes ? `${a.sla_minutes} menit` : '—'}
                    </td>

                    {/* Ditugaskan */}
                    <td style={{ padding: '12px 12px', verticalAlign: 'middle', fontSize: 12, color: '#6b7280' }}>
                      {formatDateIdShort(a.assigned_at)}
                    </td>

                    {/* Kebab menu (G34) — fixed position agar tidak terpotong overflow */}
                    <td style={{ padding: '12px 8px', verticalAlign: 'middle' }}>
                      <button
                        onClick={e => {
                          if (openKebab === a.id) { setOpenKebab(null); setKebabPos(null); return }
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setKebabPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                          setOpenKebab(a.id)
                        }}
                        style={{ padding: '4px 8px', borderWidth: 0, background: 'transparent', cursor: 'pointer', borderRadius: 6, fontSize: 16, color: '#6b7280' }}
                      >
                        <i className="ti ti-dots-vertical" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Kebab dropdown — fixed position, render di luar tabel agar tidak terpotong */}
      {openKebab && kebabPos && (() => {
        const a = filtered.find(x => x.id === openKebab)
        if (!a) return null
        return (
          <div
            style={{ position: 'fixed', top: kebabPos.top, right: kebabPos.right, background: '#fff', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 9999, minWidth: 200, overflow: 'hidden' }}
            onMouseLeave={() => { setOpenKebab(null); setKebabPos(null) }}
          >
            {getKebabItems(a).map((item, idx) => item === null ? (
              <div key={idx} style={{ height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '2px 0' }} />
            ) : (
              <button key={idx} disabled={item.disabled}
                onClick={() => onKebabAction(a, item.action)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', width: '100%', background: 'transparent', borderWidth: 0, cursor: item.disabled ? 'not-allowed' : 'pointer', fontSize: 13, color: item.disabled ? '#9ca3af' : item.color, fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = '#f9f9f8' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: 14 }} />
                {item.label}
              </button>
            ))}
          </div>
        )
      })()}
    </>
  )
}
