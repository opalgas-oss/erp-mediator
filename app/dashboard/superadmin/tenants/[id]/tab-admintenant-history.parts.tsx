'use client'

// app/dashboard/superadmin/tenants/[id]/tab-admintenant-history.parts.tsx
// Sub-komponen TabAdminTenantHistory: TabelAktif + TimelineRiwayat.
// Style constants di tab-admintenant-history.styles.ts
// Dibuat: Sesi #240 — split dari TabAdminTenantHistory.tsx (14 KB)
// Update: Sesi #243 — tambah DialogKirimUlang + icon Kirim Ulang Aktivasi (K-30 Jalur 1)
//   Icon muncul hanya jika sudah_aktivasi === false (Status: Menunggu Aktivasi)

import { useState } from 'react'
import type { AdminTenantKartu, AdminTenantHistory } from '@/lib/types/admin-tenant.types'
import { cs, JABATAN_LABEL, fmtTgl } from './tab-admintenant-history.styles'

// ─── DialogKirimUlang ─────────────────────────────────────────────────────────

interface DialogKirimUlangProps {
  at:         AdminTenantKartu
  tenantId:   string
  tenantNama: string
  onClose:    () => void
  onSuccess:  () => void
}

function DialogKirimUlang({ at, tenantId, tenantNama, onClose, onSuccess }: DialogKirimUlangProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'sukses' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const handleKirim = async () => {
    setState('loading')
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenantId}/admin-tenant`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:      'kirim_ulang_aktivasi',
          user_id:     at.user_id,
          tenant_nama: tenantNama,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Gagal kirim ulang')
      if (!json.data?.emailTerkirim) throw new Error('Email gagal terkirim — cek credential Resend di dashboard SA Providers')
      setState('sukses')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Terjadi kesalahan')
      setState('error')
    }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  }
  const modal: React.CSSProperties = {
    background: '#fff', borderRadius: 12, padding: '24px 28px', width: 380,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxWidth: '90vw',
  }

  if (state === 'sukses') return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ fontSize: 36, marginBottom: 10, color: '#3B6D11' }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Email Aktivasi Terkirim</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            Tautan aktivasi baru dikirim ke <strong>{at.user_email}</strong>.
          </div>
          <button
            onClick={() => { onSuccess(); onClose() }}
            style={{ ...cs.btn('0.5px solid #85B7EB', '#185FA5'), width: '100%', justifyContent: 'center' }}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Kirim Ulang Email Aktivasi</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>{tenantNama}</div>

        <div style={{ background: '#f9f9f8', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{at.user_name}</div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>{at.user_email}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#854F0B' }}>
            <i className="ti ti-clock" style={{ fontSize: 11, marginRight: 4 }} />
            Status: Menunggu Aktivasi
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 20 }}>
          Sistem akan membuat tautan aktivasi baru dan mengirimkannya ke email di atas.
          Tautan aktivasi lama akan kadaluarsa.
        </div>

        {state === 'error' && (
          <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
            {errMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={state === 'loading'}
            style={cs.btn('0.5px solid rgba(0,0,0,0.22)', '#1a1a1a')}
          >
            Batal
          </button>
          <button
            onClick={handleKirim}
            disabled={state === 'loading'}
            style={cs.btn('0.5px solid #85B7EB', '#185FA5')}
          >
            {state === 'loading'
              ? <><i className="ti ti-loader-2" /> Mengirim...</>
              : <><i className="ti ti-send" /> Kirim Ulang</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

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
        <div style={cs.secHdr}>
          <div>
            <div style={cs.secTitle}>AdminTenant Aktif</div>
            {aktif.length > 0 && (
              <div style={cs.secSub}>{aktif.length} orang — dapat login ke dashboard tenant ini</div>
            )}
          </div>
          <button style={cs.btn('0.5px solid #85B7EB', '#185FA5')} onClick={onTambah}>
            <i className="ti ti-user-plus" /> Tambah AdminTenant
          </button>
        </div>

        {loading ? (
          <div style={{ height: 80, background: '#f9f9f8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#6b7280' }}>
            <i className="ti ti-loader-2" style={{ marginRight: 8 }} /> Memuat...
          </div>
        ) : aktif.length === 0 ? (
          <div style={cs.empty}>
            <i className="ti ti-users" style={{ fontSize: 32, color: '#d1d5db', display: 'block', marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>Belum ada AdminTenant</div>
            <div style={{ marginBottom: 14 }}>Klik "Tambah AdminTenant" untuk mendaftarkan orang yang dapat login.</div>
          </div>
        ) : (
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
                      {new Date(at.started_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td style={{ ...cs.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {/* Icon Kirim Ulang — hanya muncul jika belum aktivasi */}
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

// ─── TimelineRiwayat ──────────────────────────────────────────────────────────

interface TimelineRiwayatProps {
  loading: boolean
  riwayat: AdminTenantHistory[]
}

export function TimelineRiwayat({ loading, riwayat }: TimelineRiwayatProps) {
  return (
    <div style={cs.card}>
      <div style={cs.secHdr}>
        <div><div style={cs.secTitle}>Riwayat AdminTenant</div></div>
        <button
          style={{ ...cs.btn('0.5px solid rgba(0,0,0,0.22)', '#6b7280'), fontSize: 12, opacity: 0.5 }}
          disabled
        >
          <i className="ti ti-download" /> Ekspor
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
        Tersimpan minimal 36 bulan. Read-only audit trail.
      </div>

      {loading ? null : riwayat.length === 0 ? (
        <div style={{ ...cs.empty, padding: '1.5rem' }}>
          <i className="ti ti-clock" style={{ fontSize: 22, color: '#d1d5db', display: 'block', marginBottom: 4 }} />
          <div style={{ fontSize: 12, color: '#6b7280' }}>Belum ada riwayat.</div>
        </div>
      ) : (
        <div>
          {riwayat.slice(0, 20).map((row, idx) => {
            const isAktif  = !row.ended_at
            const isResign = row.alasan_pergantian === 'resign'
            const dotStyle = isAktif
              ? cs.tlDot('#EAF3DE', '#3B6D11', '#97C459')
              : isResign
                ? cs.tlDot('#FCEBEB', '#A32D2D', '#F09595')
                : cs.tlDot('#f9f9f8', '#6b7280', 'rgba(0,0,0,0.12)')
            const dotIcon   = isAktif ? 'ti-user-check' : 'ti-user-x'
            const tipeChip  = !row.ended_at
              ? cs.chip('#EAF3DE', '#3B6D11', '#97C459')
              : cs.chip('#FAEEDA', '#854F0B', '#EF9F27')
            const tipeLabel = !row.ended_at
              ? 'Ditambahkan'
              : row.alasan_pergantian
                ? (row.alasan_pergantian.charAt(0).toUpperCase() + row.alasan_pergantian.slice(1))
                : 'Selesai'

            return (
              <div
                key={row.id}
                style={{ ...cs.tlItem, paddingBottom: idx === riwayat.length - 1 ? 0 : 20 }}
              >
                <div style={cs.tlLeft}>
                  <div style={dotStyle}>
                    <i className={`ti ${dotIcon}`} style={{ fontSize: 13 }} />
                  </div>
                  {idx < riwayat.length - 1 && <div style={cs.tlLine} />}
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={cs.tlWhen}>{fmtTgl(row.started_at)}</div>
                  <div style={cs.tlMain}>
                    <strong>{row.user_name}</strong>{' '}
                    {row.ended_at ? 'selesai menjabat' : 'ditambahkan'} sebagai{' '}
                    <strong>{JABATAN_LABEL[row.jabatan ?? ''] ?? row.jabatan}</strong>
                    {' '}<span style={tipeChip}>{tipeLabel}</span>
                  </div>
                  {row.alasan_pergantian && (
                    <div style={cs.tlReason}>Alasan: {row.alasan_pergantian}</div>
                  )}
                  {row.assigned_by && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, opacity: 0.8 }}>
                      Diproses oleh: SuperAdmin
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
