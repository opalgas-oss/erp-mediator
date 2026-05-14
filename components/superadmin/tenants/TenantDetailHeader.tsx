'use client'

// components/superadmin/tenants/TenantDetailHeader.tsx
// Header persisten Detail Tenant — avatar, badge, quick stats, tab nav
// Dipasang di semua 6 tab halaman detail tenant.
// Dibuat: Sesi #141 — M6 Fix Fase A (G14)
// Fix konsole error borderBottom conflict + tab alignment

import type { Tenant, TenantLifecycleStatus, TenantTipe, TenantTier, TenantStatusPKP } from '@/lib/types/tenant.types'

// ─── Konstanta badge ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<TenantLifecycleStatus, { bg: string; text: string; border: string; icon: string; label: string }> = {
  pending:    { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-hourglass',       label: 'Menunggu' },
  active:     { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check',    label: 'Aktif' },
  suspended:  { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-player-pause',    label: 'Dinonaktifkan' },
  expired:    { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9', icon: 'ti-hourglass-empty', label: 'Kedaluwarsa' },
  terminated: { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', icon: 'ti-circle-x',        label: 'Diakhiri' },
}

const PKP_STYLE: Record<NonNullable<TenantStatusPKP>, { bg: string; text: string; border: string; label: string }> = {
  pkp:     { bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB', label: 'PKP' },
  non_pkp: { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', label: 'Non-PKP' },
}

const TIPE_STYLE: Record<NonNullable<TenantTipe>, { bg: string; text: string; border: string; label: string }> = {
  internal:  { bg: '#EEEDFE', text: '#534AB7', border: '#AFA9EC', label: 'Internal' },
  eksternal: { bg: '#FAECE7', text: '#993C1D', border: '#F0997B', label: 'Eksternal' },
}

const TIER_STYLE: Record<TenantTier, { bg: string; text: string; border: string; label: string }> = {
  starter:    { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9', label: 'Starter' },
  growth:     { bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB', label: 'Growth' },
  enterprise: { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', label: 'Enterprise' },
}

// ─── Tipe tab ─────────────────────────────────────────────────────────────────

export type TenantTabId = 'info' | 'kontrak' | 'kategori' | 'pic' | 'user' | 'config'

const TABS: { id: TenantTabId; label: string }[] = [
  { id: 'info',     label: 'Info Umum' },
  { id: 'kontrak',  label: 'Kontrak Sewa' },
  { id: 'kategori', label: 'Kategori' },
  { id: 'pic',      label: 'PIC & Riwayat' },
  { id: 'user',     label: 'User Tenant' },
  { id: 'config',   label: 'Override Config' },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuickStats {
  kategori_aktif:   number
  user_aktif:       number
  user_quota:       number
  kontrak_berakhir: string | null
  auto_renewal:     boolean
}

interface Props {
  tenant:      Tenant
  activeTab:   TenantTabId
  onTabChange: (tab: TenantTabId) => void
  onSuspend:   () => void
  onTerminate: () => void
  quickStats:  QuickStats
}

// ─── Helper: format tanggal Indonesia ────────────────────────────────────────

function formatTgl(isoStr: string | null): string {
  if (!isoStr) return 'Permanen'
  return new Date(isoStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTglLengkap(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Badge mini ───────────────────────────────────────────────────────────────

function Bdg({ bg, text, border, icon, label }: { bg: string; text: string; border: string; icon?: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500,
      background: bg, color: text, border: `0.5px solid ${border}`,
    }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 12 }} />}
      {label}
    </span>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export function TenantDetailHeader({ tenant, activeTab, onTabChange, onSuspend, onTerminate, quickStats }: Props) {
  const statusStyle = STATUS_STYLE[tenant.status]
  const initials    = (tenant.nama_brand ?? 'T').substring(0, 2).toUpperCase()

  const userDisplay = tenant.tier === 'enterprise'
    ? `${quickStats.user_aktif} / ∞`
    : `${quickStats.user_aktif} / ${tenant.tier === 'starter' ? 5 : 15}`

  return (
    <div style={{ marginBottom: '1.25rem' }}>

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-layout-dashboard" />
        Dashboard SuperAdmin
        <i className="ti ti-chevron-right" style={{ fontSize: 11 }} />
        Kelola Tenant
        <i className="ti ti-chevron-right" style={{ fontSize: 11 }} />
        {tenant.nama_brand}
      </div>

      {/* ── Satu card container: info + quick stats + tab nav ──────────────── */}
      <div style={{
        background: '#fff',
        borderWidth: '0.5px',
        borderStyle: 'solid',
        borderColor: 'rgba(0,0,0,0.12)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: '1.25rem',
      }}>

        {/* Info & tombol aksi */}
        <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>

            {/* Kiri: avatar + nama + badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: '#E6F1FB', color: '#185FA5', fontSize: 18, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.3 }}>{tenant.nama_brand}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                  {[tenant.nama_legal, tenant.tenant_display_id, `Bergabung ${formatTglLengkap(tenant.created_at)}`]
                    .filter(Boolean).join(' · ')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  <Bdg bg={statusStyle.bg} text={statusStyle.text} border={statusStyle.border} icon={statusStyle.icon} label={statusStyle.label} />
                  {tenant.status_pkp && <Bdg {...PKP_STYLE[tenant.status_pkp]} />}
                  {tenant.tipe && <Bdg {...TIPE_STYLE[tenant.tipe]} />}
                  <Bdg {...TIER_STYLE[tenant.tier]} />
                  {tenant.updated_at && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      Aktivitas terakhir:{' '}
                      {new Date(tenant.updated_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Kanan: tombol aksi */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              {tenant.status === 'active' && (
                <button onClick={onSuspend} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#EF9F27', color: '#854F0B', background: 'transparent' }}>
                  <i className="ti ti-player-pause" /> Nonaktifkan sementara
                </button>
              )}
              {tenant.status === 'suspended' && (
                <button onClick={onSuspend} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#97C459', color: '#3B6D11', background: 'transparent' }}>
                  <i className="ti ti-refresh" /> Aktifkan kembali
                </button>
              )}
              {tenant.status !== 'terminated' && (
                <button onClick={onTerminate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', borderWidth: '0.5px', borderStyle: 'solid', borderColor: '#F09595', color: '#A32D2D', background: 'transparent' }}>
                  <i className="ti ti-circle-x" /> Akhiri tenant
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8,
          padding: '0 1.25rem 1rem',
        }}>
          {[
            { label: 'Kategori dipegang', value: String(quickStats.kategori_aktif) },
            { label: 'User aktif',        value: userDisplay },
            { label: 'Kontrak berakhir',  value: formatTgl(quickStats.kontrak_berakhir) },
            { label: 'Auto-renewal',      value: quickStats.auto_renewal ? 'Aktif' : 'Tidak aktif' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f9f9f8', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tab navigation — bagian dari card, borderTop sebagai pemisah */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          borderTopWidth: '0.5px',
          borderTopStyle: 'solid',
          borderTopColor: 'rgba(0,0,0,0.12)',
          padding: '0 1.25rem',
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  color: isActive ? '#1a1a1a' : '#6b7280',
                  fontWeight: isActive ? 500 : 400,
                  background: 'transparent',
                  // ← gunakan HANYA non-shorthand, tidak campur dengan borderBottom shorthand
                  borderTopWidth: 0,
                  borderTopStyle: 'solid',
                  borderTopColor: 'transparent',
                  borderLeftWidth: 0,
                  borderLeftStyle: 'solid',
                  borderLeftColor: 'transparent',
                  borderRightWidth: 0,
                  borderRightStyle: 'solid',
                  borderRightColor: 'transparent',
                  borderBottomWidth: 2,
                  borderBottomStyle: 'solid',
                  borderBottomColor: isActive ? '#1a1a1a' : 'transparent',
                  marginBottom: -0.5,   // overlap border card
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
