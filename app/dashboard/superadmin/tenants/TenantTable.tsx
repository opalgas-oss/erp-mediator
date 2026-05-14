'use client'

// app/dashboard/superadmin/tenants/TenantTable.tsx
// Tabel List Tenants — 7 kolom sesuai mockup + style konsisten dengan Detail Tenant
// Fix: G01 (Kategori menggantikan Tier), G02 (Bergabung), G03 (Tipe badge), G04 (kebab 3-item),
//      G05 (Status badge dari DESIGN_TOKEN_M6)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase F

import { useState } from 'react'
import type { TenantListItem, TenantLifecycleStatus } from '@/lib/types/tenant.types'
import { TENANT_LIFECYCLE_LABEL } from '@/lib/constants/tenant.constant'

// ─── Status style (DESIGN_TOKEN_M6) ───────────────────────────────────────────

const STATUS_STYLE: Record<TenantLifecycleStatus, { bg: string; text: string; border: string; icon: string }> = {
  active:     { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check' },
  pending:    { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-hourglass' },
  suspended:  { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-player-pause' },
  expired:    { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9', icon: 'ti-hourglass-empty' },
  terminated: { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', icon: 'ti-circle-x' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:       TenantListItem[]
  loading:    boolean
  onRowClick: (id: string) => void
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function TenantTable({ data, loading, onRowClick }: Props) {
  const [openKebab, setOpenKebab] = useState<string | null>(null)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: 48, background: '#f9f9f8', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{ background: '#fff', borderWidth: '1px', borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
        Tidak ada tenant yang sesuai filter.
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
        <colgroup>
          {/* Nama tenant */}<col style={{ width: '22%' }} />
          {/* Kode tenant */}<col style={{ width: '14%' }} />
          {/* Kategori    */}<col style={{ width: '18%' }} />
          {/* Tipe        */}<col style={{ width: '9%'  }} />
          {/* PIC         */}<col style={{ width: '14%' }} />
          {/* Status      */}<col style={{ width: '12%' }} />
          {/* Bergabung   */}<col style={{ width: '6%'  }} />
          {/* Aksi        */}<col style={{ width: '5%'  }} />
        </colgroup>
        <thead>
          <tr style={{ background: '#f9f9f8' }}>
            {['Nama tenant', 'Kode tenant', 'Kategori', 'Tipe', 'PIC saat ini', 'Status', 'Bergabung', ''].map((h, i) => (
              <th key={i} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(tenant => {
            const status = STATUS_STYLE[tenant.status] ?? STATUS_STYLE.pending
            const isInternal = tenant.tipe === 'internal'

            return (
              <tr
                key={tenant.id}
                style={{ borderTopWidth: '0.5px', borderTopStyle: 'solid', borderTopColor: 'rgba(0,0,0,0.12)', cursor: 'pointer' }}
                onClick={() => onRowClick(tenant.id)}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f8')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                {/* Nama tenant */}
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{tenant.nama_brand}</div>
                  {tenant.nama_legal && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{tenant.nama_legal}</div>
                  )}
                </td>

                {/* Kode tenant */}
                <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}>
                  {tenant.slug ?? '—'}
                </td>

                {/* Kategori (G01) — display jumlah active categories */}
                <td style={{ padding: '12px 14px' }}>
                  {tenant.active_categories > 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1a1a1a' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#97C459' }} />
                      {tenant.active_categories} kategori
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Belum ada</span>
                  )}
                </td>

                {/* Tipe (G03) — badge berwarna */}
                <td style={{ padding: '12px 14px' }}>
                  {tenant.tipe ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 100,
                      fontSize: 11, fontWeight: 500, borderWidth: '0.5px', borderStyle: 'solid',
                      background:  isInternal ? '#EEEDFE' : '#FAECE7',
                      color:       isInternal ? '#534AB7' : '#993C1D',
                      borderColor: isInternal ? '#AFA9EC' : '#F0997B',
                    }}>
                      {isInternal ? 'Internal' : 'Eksternal'}
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                  )}
                </td>

                {/* PIC */}
                <td style={{ padding: '12px 14px' }}>
                  {tenant.pic_name ? (
                    <span style={{ fontSize: 12 }}>{tenant.pic_name}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Belum ada</span>
                  )}
                </td>

                {/* Status (G05) */}
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 100,
                    fontSize: 11, fontWeight: 500, borderWidth: '0.5px', borderStyle: 'solid',
                    background: status.bg, color: status.text, borderColor: status.border,
                  }}>
                    <i className={`ti ${status.icon}`} style={{ fontSize: 11 }} />
                    {TENANT_LIFECYCLE_LABEL[tenant.status]}
                  </span>
                </td>

                {/* Bergabung (G02) */}
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>
                  {new Date(tenant.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                </td>

                {/* Kebab menu (G04) */}
                <td style={{ padding: '12px 8px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenKebab(openKebab === tenant.id ? null : tenant.id)}
                    style={{ padding: '4px 8px', borderWidth: 0, background: 'transparent', cursor: 'pointer', borderRadius: 6, fontSize: 16, color: '#6b7280' }}
                  >
                    <i className="ti ti-dots-vertical" />
                  </button>
                  {openKebab === tenant.id && (
                    <div
                      style={{ position: 'absolute', right: 8, top: '100%', background: '#fff', borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 200, overflow: 'hidden' }}
                      onMouseLeave={() => setOpenKebab(null)}
                    >
                      {[
                        { icon: 'ti-external-link', label: 'Lihat Detail',           color: '#1a1a1a', disabled: false, action: () => onRowClick(tenant.id) },
                        null,
                        { icon: 'ti-player-pause',  label: 'Nonaktifkan Sementara', color: '#854F0B', disabled: tenant.status !== 'active', action: () => {} },
                        { icon: 'ti-circle-x',      label: 'Akhiri Tenant',          color: '#A32D2D', disabled: tenant.status === 'terminated', action: () => {} },
                      ].map((item, idx) =>
                        item === null ? (
                          <div key={idx} style={{ height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '2px 0' }} />
                        ) : (
                          <button
                            key={idx}
                            disabled={item.disabled}
                            onClick={() => { setOpenKebab(null); item.action() }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', width: '100%', background: 'transparent', borderWidth: 0, cursor: item.disabled ? 'not-allowed' : 'pointer', fontSize: 13, color: item.disabled ? '#9ca3af' : item.color, fontFamily: 'inherit', textAlign: 'left' }}
                            onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = '#f9f9f8' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          >
                            <i className={`ti ${item.icon}`} style={{ fontSize: 14 }} />
                            {item.label}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
