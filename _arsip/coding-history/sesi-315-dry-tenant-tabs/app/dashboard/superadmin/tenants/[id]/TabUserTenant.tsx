'use client'
// ARSIP PRA-B-05 S#316 — TabUserTenant.tsx
// Perubahan B-05: S.card lokal → import dari _shared/tenant-tab-ui
// File aktual saat arsip dibuat ada di path project asli

import type { TenantTier } from '@/lib/types/tenant.types'
interface Props { tenantId: string; tier: TenantTier }
const TIER_INFO: Record<TenantTier, { quota: number; label: string; bg: string; text: string; border: string }> = {
  starter:    { quota: 5,    label: 'Starter (maks. 5 user)',       bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9' },
  growth:     { quota: 20,   label: 'Growth (maks. 20 user)',       bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB' },
  enterprise: { quota: 9999, label: 'Enterprise (tidak terbatas)',  bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' },
}
const S = { card: { background: '#fff', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties }
export function TabUserTenant({ tenantId: _tenantId, tier }: Props) {
  const info = TIER_INFO[tier]; const used = 0; const pct = tier === 'enterprise' ? 0 : Math.round((used / info.quota) * 100)
  return <div>{/* [konten penuh ada di file aktif] */}</div>
}
