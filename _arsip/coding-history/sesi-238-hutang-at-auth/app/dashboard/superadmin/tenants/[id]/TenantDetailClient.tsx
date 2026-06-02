'use client'

// app/dashboard/superadmin/tenants/[id]/TenantDetailClient.tsx
// Orchestrator Detail Tenant — TenantDetailHeader persisten + 6 tab
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #141 — M6 Fix Fase A (G14) — integrasi TenantDetailHeader

import { useState }    from 'react'
import { TenantDetailHeader, type TenantTabId } from '@/components/superadmin/tenants/TenantDetailHeader'
import { TabInfoUmum }       from './TabInfoUmum'
import { TabKontrakSewa }    from './TabKontrakSewa'
import { TabKategori }       from './TabKategori'
import { TabPICHistory }     from './TabPICHistory'
import { TabUserTenant }     from './TabUserTenant'
import { TabOverrideConfig } from './TabOverrideConfig'
import type { Tenant }       from '@/lib/types/tenant.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { tenant: Tenant }

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function TenantDetailClient({ tenant: initialTenant }: Props) {
  const [tenant,    setTenant]    = useState<Tenant>(initialTenant)
  const [activeTab, setActiveTab] = useState<TenantTabId>('info')

  // Refresh data setelah ada perubahan di tab
  const handleRefresh = async () => {
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}`)
      const json = await res.json()
      if (json.success) setTenant(json.data)
    } catch { /* silent */ }
  }

  // Quick stats dari field yang ada di Tenant
  const quickStats = {
    kategori_aktif:   0,                          // akan diisi dari API join; placeholder
    user_aktif:       0,                          // sama
    user_quota:       tenant.tier === 'starter' ? 5 : tenant.tier === 'growth' ? 15 : 9999,
    kontrak_berakhir: tenant.contract_end_date ?? null,
    auto_renewal:     tenant.auto_renewal,
  }

  const handleSuspend   = () => { /* TODO: buka modal konfirmasi suspend */ }
  const handleTerminate = () => { /* TODO: buka modal konfirmasi terminate */ }

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-6">

        {/* Header persisten — TenantDetailHeader mengelola breadcrumb + hcard + quick stats + tab nav */}
        <TenantDetailHeader
          tenant={tenant}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSuspend={handleSuspend}
          onTerminate={handleTerminate}
          quickStats={quickStats}
        />

        {/* Tab Content */}
        {activeTab === 'info'     && <TabInfoUmum      tenant={tenant} onRefresh={handleRefresh} />}
        {activeTab === 'kontrak'  && <TabKontrakSewa   tenant={tenant} onRefresh={handleRefresh} />}
        {activeTab === 'kategori' && <TabKategori      tenantId={tenant.id} />}
        {activeTab === 'pic'      && <TabPICHistory    tenantId={tenant.id} />}
        {activeTab === 'user'     && <TabUserTenant    tenantId={tenant.id} tier={tenant.tier} />}
        {activeTab === 'config'   && <TabOverrideConfig tenantId={tenant.id} />}
      </div>
    </div>
  )
}
