'use client'

// app/dashboard/superadmin/tenants/[id]/tab-admintenant-history.timeline.tsx
// TimelineRiwayat — dipecah dari tab-admintenant-history.parts.tsx (S#324, file size > 10KB)
// Dibuat: Sesi #240 — dipindah ke file ini Sesi #324
// Update: Sesi #324 — chevron collapsible (Blok D)

import { useState } from 'react'
import type { AdminTenantHistory } from '@/lib/types/admin-tenant.types'
import { cs, JABATAN_LABEL, fmtTgl } from './tab-admintenant-history.styles'

interface TimelineRiwayatProps {
  loading: boolean
  riwayat: AdminTenantHistory[]
}

export function TimelineRiwayat({ loading, riwayat }: TimelineRiwayatProps) {
  const [open, setOpen] = useState(true)

  return (
    <div style={cs.card}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ ...cs.secHdr, cursor: 'pointer', userSelect: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
      >
        <div><div style={cs.secTitle}>Riwayat AdminTenant</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            style={{ ...cs.btn('0.5px solid rgba(0,0,0,0.22)', '#6b7280'), fontSize: 12, opacity: 0.5 }}
            disabled
            onClick={e => e.stopPropagation()}
          >
            <i className="ti ti-download" /> Ekspor
          </button>
          <i
            className="ti ti-chevron-down"
            style={{ fontSize: 15, color: '#6b7280', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>
      </div>
      {open && (
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
          Tersimpan minimal 36 bulan. Read-only audit trail.
        </div>
      )}

      {open && (loading ? null : riwayat.length === 0 ? (
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
      ))}
    </div>
  )
}
