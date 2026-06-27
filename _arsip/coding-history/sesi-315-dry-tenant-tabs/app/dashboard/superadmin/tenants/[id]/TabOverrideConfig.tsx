'use client'
// ARSIP PRA-B-05 S#316 — TabOverrideConfig.tsx
// Perubahan B-05: S.card lokal → import dari _shared/tenant-tab-ui
// File aktual saat arsip dibuat ada di path project asli

interface Props { tenantId: string }
const S = { card: { background: '#fff', borderWidth: '0.5px', borderStyle: 'solid' as const, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12 } as React.CSSProperties }
export function TabOverrideConfig({ tenantId: _tenantId }: Props) {
  return <div>{/* [konten penuh ada di file aktif] */}</div>
}
