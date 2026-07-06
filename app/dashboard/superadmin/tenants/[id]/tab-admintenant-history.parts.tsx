'use client'

// app/dashboard/superadmin/tenants/[id]/tab-admintenant-history.parts.tsx
// TabelAktif — komponen tabel AdminTenant aktif.
// Dibuat: Sesi #240 — split dari TabAdminTenantHistory.tsx
// Update: Sesi #324 — split TimelineRiwayat ke .timeline.tsx + DialogKirimUlang ke .dialog.tsx
//                     + chevron collapsible (Blok D)
// Re-export TimelineRiwayat agar konsumer (TabAdminTenantHistory.tsx) tidak perlu ubah import.

import { useState } from 'react'
import type { AdminTenantKartu } from '@/lib/types/admin-tenant.types'
import { cs, JABATAN_LABEL } from './tab-admintenant-history.styles'
import { formatDateIdShort } from '@/lib/utils-client'
import { DialogKirimUlang } from './tab-admintenant-history.dialog'

export { TimelineRiwayat } from './tab-admintenant-history.timeline'

// ─── TabelAktif ───────────────────────────────────────────────────────────────

interface TabelAktifProps {
  loading:    boolean
  aktif:      AdminTenantKartu[]
  tenantId:   string
  tenantNama: string
  onEdit:     (at: AdminTenantKartu) => void
  onTambah:   () => void
  onRefresh:  () => void
}

export function TabelAktif({ loading, aktif, tenantId, tenantNama, onEdit, onTambah, onRefresh }: TabelAktifProps) {
  const [kirimUlangTarget, setKirimUlangTarget] = useState<AdminTenantKartu | null>(null)
  const [open, setOpen] = useState(true)

  return (
    <>
      {kirimUlangTarget && (
        <DialogKirimUlang
          at={kirimUlangTarget}
          tenantId={tenantId}
          tenantNama={tenantNama}
          onClose={() => setKirimUlangTarget(null)}
          onSuccess={() => { setKirimUlangTarget(null); onRefresh() }}
        />
      )}

      <div style={cs.card}>
        <div
          onClick={() => setOpen(v => !v)}
          style={{ ...cs.secHdr, cursor: 'pointer', userSelect: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <div>
            <div style={cs.secTitle}>AdminTenant Aktif</div>
            {aktif.length > 0 && (
              <div style={cs.secSub}>{aktif.length} orang — dapat login ke dashboard tenant ini</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              style={cs.btn('0.5px solid #85B7EB', '#185FA5')}
              onClick={e => { e.stopPropagation(); onTambah() }}
            >
              <i className="ti ti-user-plus" /> Tambah AdminTenant
            </button>
            <i
              className="ti ti-chevron-down"
              style={{ fontSize: 15, color: '#6b7280', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </div>
        </div>

        {open && loading ? (
          <div style={{ height: 80, background: '#f9f9f8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#6b7280' }}>
            <i className="ti ti-loader-2" style={{ marginRight: 8 }} /> Memuat...
          </div>
        ) : open && aktif.length === 0 ? (
          <div style={cs.empty}>
            <i className="ti ti-users" style={{ fontSize: 32, color: '#d1d5db', display: 'block', marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>Belum ada AdminTenant</div>
            <div style={{ marginBottom: 14 }}>Klik "Tambah AdminTenant" untuk mendaftarkan orang yang dapat login.</div>
          </div>
        ) : open ? (
          <div style={cs.tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Nama & Email', 'Jabatan', 'Kontak WA', 'Status Akun', 'Sejak', 'Aksi'].map(h => (
                    <th key={h} style={cs.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aktif.map(at => (
                  <tr
                    key={at.id}
                    style={{ borderBottom: '0.5px solid rgba(0,0,0,0.12)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <td style={cs.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={cs.av(at.sudah_aktivasi)}>
                          {(at.user_name ?? 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{at.user_name}</div>
                          <div style={{ fontSize: 11.5, color: '#6b7280' }}>{at.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={cs.td}>
                      <span style={at.jabatan === 'penanggung_jawab'
                        ? cs.chip('#E6F1FB', '#185FA5', '#85B7EB')
                        : cs.chip('#f9f9f8', '#6b7280', 'rgba(0,0,0,0.12)')}>
                        {JABATAN_LABEL[at.jabatan ?? ''] ?? at.jabatan ?? '—'}
                      </span>
                    </td>
                    <td style={cs.td}>
                      {at.user_wa
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280' }}>
                            <i className="ti ti-brand-whatsapp" style={{ fontSize: 13 }} />{at.user_wa}
                          </div>
                        : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={cs.td}>
                      {at.sudah_aktivasi
                        ? <span style={cs.chip('#EAF3DE', '#3B6D11', '#97C459')}>
                            <i className="ti ti-circle-filled" style={{ fontSize: 8 }} /> Aktif
                          </span>
                        : <span style={cs.chip('#FAEEDA', '#854F0B', '#EF9F27')}>
                            <i className="ti ti-clock" style={{ fontSize: 9 }} /> Menunggu Aktivasi
                          </span>}
                    </td>
                    <td style={{ ...cs.td, fontSize: 12, color: '#6b7280' }}>
                      {formatDateIdShort(at.started_at)}
                    </td>
                    <td style={{ ...cs.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {!at.sudah_aktivasi && (
                          <button
                            style={cs.btn('0.5px solid #EF9F27', '#854F0B')}
                            title="Kirim Ulang Email Aktivasi"
                            onClick={() => setKirimUlangTarget(at)}
                          >
                            <i className="ti ti-send" />
                          </button>
                        )}
                        <button
                          style={cs.btn('0.5px solid #85B7EB', '#185FA5')}
                          title="Kelola Akses AdminTenant"
                          onClick={() => onEdit(at)}
                        >
                          <i className="ti ti-pencil" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
