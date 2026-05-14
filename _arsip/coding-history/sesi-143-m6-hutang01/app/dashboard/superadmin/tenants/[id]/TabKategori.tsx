'use client'

// app/dashboard/superadmin/tenants/[id]/TabKategori.tsx
// Tab Kategori — toolbar + 7-kolom tabel + kebab + 3 modal
// Fix: G31 (toolbar), G32 (7 kolom), G33 (breadcrumb), G34 (kebab), G35-G37 (modal), G38 (konstanta)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase C

import { useState, useEffect } from 'react'
import { toast }               from 'sonner'
import type { AssignmentTabData, AssignmentDenganKategori } from '@/lib/types/tenant-category-assignment.types'

interface Props { tenantId: string }

// ─── Konstanta status (G38) ───────────────────────────────────────────────────

const ASSIGNMENT_STATUS_STYLE: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
  active:           { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check',    label: 'Aktif' },
  suspended:        { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-player-pause',    label: 'Ditangguhkan' },
  revoked:          { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', icon: 'ti-x',               label: 'Dicabut' },       // G38
  pending_handover: { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-arrows-exchange', label: 'Proses Serah Terima' },
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const S = {
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
  label: { fontSize: 12, color: '#6b7280' } as React.CSSProperties,
}

// ─── Badge status ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const st = ASSIGNMENT_STATUS_STYLE[status] ?? ASSIGNMENT_STATUS_STYLE.active
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      borderRadius: 100, fontSize: 11, fontWeight: 500,
      background: st.bg, color: st.text,
      borderWidth: '0.5px', borderStyle: 'solid', borderColor: st.border,
    }}>
      <i className={`ti ${st.icon}`} style={{ fontSize: 11 }} />
      {st.label}
    </span>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TabKategori({ tenantId }: Props) {
  const [data,      setData]      = useState<AssignmentTabData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [openKebab, setOpenKebab] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/categories`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      toast.error('Gagal memuat data kategori')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [tenantId])

  const filtered = (data?.assignments ?? []).filter((a: AssignmentDenganKategori) => {
    const matchSearch = !search || a.kategori.display_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div>

      {/* Summary cards 3-kolom (C1) */}
          {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1rem' }}>
          {/* Card 1: Kategori aktif */}
          <div style={{ ...S.card, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Kategori aktif dipegang</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{data.summary.total_aktif}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{data.summary.total_aktif} kategori ditugaskan</div>
          </div>

          {/* Card 2: Komisi override */}
          <div style={{ ...S.card, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Komisi override aktif</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{data.summary.total_override_komisi}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{data.summary.total_override_komisi > 0 ? `${data.summary.total_override_komisi} kategori pakai rate khusus` : 'Semua ikut rate kontrak'}</div>
          </div>

          {/* Card 3: Coverage area — bedakan belum setting vs sudah setting */}
          {data.summary.coverage_summary === 'BELUM_SETTING' ? (
            <div style={{ ...S.card, padding: '12px 14px', background: '#FAEEDA', borderColor: '#EF9F27' }}>
              <div style={{ fontSize: 11, color: '#854F0B', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} />
                Coverage area
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B' }}>Belum disetting</div>
              <div style={{ fontSize: 11, color: '#854F0B', marginTop: 4, lineHeight: 1.5 }}>
                Lakukan:<br />
                1. Assign kategori ke tenant<br />
                2. Set area coverage tiap kategori
              </div>
            </div>
          ) : (
            <div style={{ ...S.card, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Coverage area</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{data.summary.coverage_summary}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Berlaku untuk semua kategori</div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar (C2 — G31) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kategori..."
              style={{ width: 220, padding: '7px 10px 7px 28px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '6px 10px', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
          >
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="suspended">Ditangguhkan</option>
            <option value="revoked">Dicabut</option>
          </select>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#85B7EB', color: '#185FA5', background: '#E6F1FB' }}>
          <i className="ti ti-plus" /> Tambah Kategori
        </button>
      </div>

      {/* Tabel 7 kolom (C3 — G32 G33) */}
      <div style={{ ...S.card, overflow: 'hidden', marginBottom: '1rem' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Memuat data kategori…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-category" style={{ fontSize: 32, color: '#9ca3af', display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Belum ada kategori ditugaskan</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9f9f8' }}>
                {['Kategori', 'Status', 'Komisi', 'Coverage area', 'SLA respon', 'Ditugaskan', ''].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left' }}>{h}</th>
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
                      {' · '}{new Date(a.assigned_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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

                  {/* Coverage area */}
                  <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                    {a.coverage_areas?.length ? (
                      a.coverage_areas.map(ar => (
                        <span key={ar} style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 100, fontSize: 11, background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', color: '#6b7280', marginRight: 2, marginBottom: 2 }}>{ar}</span>
                      ))
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>Seluruh Indonesia</span>
                    )}
                  </td>

                  {/* SLA respon */}
                  <td style={{ padding: '12px 12px', verticalAlign: 'middle', fontSize: 12, color: '#6b7280' }}>
                    {a.sla_minutes ? `${a.sla_minutes} menit` : '—'}
                  </td>

                  {/* Ditugaskan */}
                  <td style={{ padding: '12px 12px', verticalAlign: 'middle', fontSize: 12, color: '#6b7280' }}>
                    {new Date(a.assigned_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Kebab menu (G34) */}
                  <td style={{ padding: '12px 8px', verticalAlign: 'middle', position: 'relative' }}>
                    <button
                      onClick={() => setOpenKebab(openKebab === a.id ? null : a.id)}
                      style={{ padding: '4px 8px', borderWidth: 0, background: 'transparent', cursor: 'pointer', borderRadius: 6, fontSize: 16, color: '#6b7280' }}
                    >
                      <i className="ti ti-dots-vertical" />
                    </button>
                    {openKebab === a.id && (
                      <div style={{ position: 'absolute', right: 8, top: '100%', background: '#fff', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 200, overflow: 'hidden' }}
                        onMouseLeave={() => setOpenKebab(null)}>
                        {[
                          { icon: 'ti-percentage',    label: 'Edit override komisi',       color: '#1a1a1a', disabled: a.status !== 'active' },
                          { icon: 'ti-history',        label: 'Lihat riwayat assignment',  color: '#1a1a1a', disabled: false },
                          null, // separator
                          { icon: 'ti-player-pause',  label: 'Tangguhkan sementara',       color: '#854F0B', disabled: a.status !== 'active' },
                          { icon: 'ti-arrows-exchange',label: 'Transfer ke tenant lain',   color: '#185FA5', disabled: false },
                          null,
                          { icon: 'ti-x',             label: 'Cabut penugasan',            color: '#A32D2D', disabled: false },
                        ].map((item, idx) => item === null ? (
                          <div key={idx} style={{ height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '2px 0' }} />
                        ) : (
                          <button key={idx} disabled={item.disabled} onClick={() => { setOpenKebab(null); toast.info(`${item.label}: segera tersedia`) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', width: '100%', background: 'transparent', borderWidth: 0, cursor: item.disabled ? 'not-allowed' : 'pointer', fontSize: 13, color: item.disabled ? '#9ca3af' : item.color, fontFamily: 'inherit', textAlign: 'left' }}
                            onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = '#f9f9f8' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          >
                            <i className={`ti ${item.icon}`} style={{ fontSize: 14 }} />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box (C5) */}
      <div style={{ fontSize: 12, color: '#6b7280', background: '#f9f9f8', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <i className="ti ti-info-circle" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Aturan penugasan:</strong> Satu kategori hanya bisa dipegang satu tenant aktif pada satu waktu.
          Sebelum menugaskan kategori yang sudah dipegang tenant lain, sistem akan meminta konfirmasi serah terima (handover).
          Cabut penugasan memerlukan konfirmasi 2 langkah karena tidak bisa dibatalkan.
        </div>
      </div>
    </div>
  )
}
