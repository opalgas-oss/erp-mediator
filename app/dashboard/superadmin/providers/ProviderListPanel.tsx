'use client'
// app/dashboard/superadmin/providers/ProviderListPanel.tsx
// Panel kiri halaman API Provider — daftar provider dikelompokkan 2 kategori:
//   1. Koneksi Aplikasi (operational providers — tools yang menjalankan aplikasi)
//   2. Monitoring Platform (management providers — dipakai sistem monitoring otomatis)
// Dibuat: Sesi #151 — split dari ProvidersClient.tsx 22.35 KB + M3 Monitoring grouping

import { HealthBadge } from '@/components/superadmin/HealthBadge'
import { TYPOGRAPHY }  from '@/lib/constants/ui-tokens.constant'
import type { ServiceProvider } from '@/lib/types/provider.types'

// ─── Kategori grouping ────────────────────────────────────────────────────────

const MONITORING_KATEGORI = new Set(['management', 'queue'])

function isMonitoringProvider(p: ServiceProvider) {
  return MONITORING_KATEGORI.has(p.kategori)
}

// Label kategori yang ramah pengguna
const KATEGORI_LABEL: Record<string, string> = {
  database:    'Database',
  cache:       'Cache',
  media:       'Media & Storage',
  payment:     'Pembayaran',
  messaging:   'Pesan (WA)',
  email:       'Email',
  search:      'Pencarian',
  cdn:         'CDN',
  management:  'API Management',
  queue:       'Message Queue',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  providers:        ServiceProvider[]
  selectedProvider: ServiceProvider | null
  onSelect:         (p: ServiceProvider) => void
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function ProviderListPanel({ providers, selectedProvider, onSelect }: Props) {
  const appProviders       = providers.filter(p => !isMonitoringProvider(p))
  const monitorProviders   = providers.filter(p =>  isMonitoringProvider(p))

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, overflow: 'hidden' }}>

      {/* ── Section: Koneksi Aplikasi ── */}
      <div style={{ background: '#f9f9f8', padding: '8px 14px 6px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Koneksi Aplikasi
        </p>
        <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>Tools yang menjalankan aplikasi</p>
      </div>

      {appProviders.map(p => (
        <ProviderRow
          key={p.id}
          provider={p}
          isSelected={selectedProvider?.id === p.id}
          onSelect={onSelect}
        />
      ))}

      {/* ── Divider ── */}
      <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '4px 0' }} />

      {/* ── Section: Monitoring Platform ── */}
      <div style={{ background: '#f9f9f8', padding: '8px 14px 6px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Monitoring Platform
        </p>
        <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>Dipakai sistem monitoring otomatis</p>
      </div>

      {monitorProviders.map(p => (
        <ProviderRow
          key={p.id}
          provider={p}
          isSelected={selectedProvider?.id === p.id}
          onSelect={onSelect}
          isMonitoring
        />
      ))}
    </div>
  )
}

// ─── Sub-komponen: satu baris provider ───────────────────────────────────────

function ProviderRow({
  provider,
  isSelected,
  onSelect,
  isMonitoring = false,
}: {
  provider:    ServiceProvider
  isSelected:  boolean
  onSelect:    (p: ServiceProvider) => void
  isMonitoring?: boolean
}) {
  const isQStash = provider.kode === 'qstash'

  return (
    <button
      onClick={() => onSelect(provider)}
      style={{
        width: '100%', textAlign: 'left',
        padding: '10px 14px',
        borderBottom: '0.5px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: isSelected ? '#E6F1FB' : 'transparent',
        cursor: 'pointer', border: 'none', fontFamily: 'inherit',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9f9f8' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provider.nama}</p>
          {isMonitoring && (
            <span style={{
              fontSize: 9, fontWeight: 600, color: '#185FA5', background: '#E6F1FB',
              border: '0.5px solid #85B7EB', borderRadius: 100, padding: '1px 5px',
            }}>
              MONITORING
            </span>
          )}
        </div>
        <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
          {KATEGORI_LABEL[provider.kategori] ?? provider.kategori}
          {isQStash && ' · Token via .env'}
        </p>
      </div>
      <HealthBadge status={provider.health_overall} size="sm" />
    </button>
  )
}
