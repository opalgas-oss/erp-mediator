'use client'

// app/dashboard/superadmin/tenants/[id]/TabUserTenant.tsx
// Tab User Tenant — daftar user + quota bar
// CATATAN: Implementasi penuh menunggu M8 (User Membership) — Mockup_07.
// Sesi #141: placeholder dengan style konsisten dengan mockup design token.
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — style konsistensi mockup

import type { TenantTier } from '@/lib/types/tenant.types'

interface Props { tenantId: string; tier: TenantTier }

const TIER_INFO: Record<TenantTier, { quota: number; label: string; bg: string; text: string; border: string }> = {
  starter:    { quota: 5,    label: 'Starter (maks. 5 user)',        bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9' },
  growth:     { quota: 20,   label: 'Growth (maks. 20 user)',        bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB' },
  enterprise: { quota: 9999, label: 'Enterprise (tidak terbatas)',   bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' },
}

const S = {
  card: { background: '#fff', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties,
}

export function TabUserTenant({ tenantId: _tenantId, tier }: Props) {
  const info = TIER_INFO[tier]
  const used = 0   // placeholder — akan diisi dari M8 API
  const pct  = tier === 'enterprise' ? 0 : Math.round((used / info.quota) * 100)

  return (
    <div>

      {/* Card kuota */}
      <div style={{ ...S.card, padding: 18, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEEDFE', color: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              <i className="ti ti-users" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>Kuota User Tenant</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Batas user aktif sesuai paket berlangganan</div>
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500,
            background: info.bg, color: info.text,
            borderWidth: '0.5px', borderStyle: 'solid', borderColor: info.border,
          }}>
            {info.label}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            <span>Terpakai</span>
            <span>{used} / {tier === 'enterprise' ? '∞' : info.quota} user</span>
          </div>
          <div style={{ height: 6, borderRadius: 100, background: '#f1f5f9', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: '#185FA5',
              borderRadius: 100,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </div>

      {/* Placeholder informasi */}
      <div style={{
        background: '#fff',
        borderWidth: '0.5px', borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.22)',
        borderRadius: 12,
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f9f9f8', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            <i className="ti ti-user-search" />
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>
          Fitur Manajemen User Tenant
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
          Daftar user aktif tenant ini, undangan user baru, dan manajemen role/permission akan tersedia
          setelah modul M8 (User Membership) selesai dikerjakan.
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-info-circle" />
          Referensi Mockup_07_Tab_User_Tenant
        </div>
      </div>
    </div>
  )
}
