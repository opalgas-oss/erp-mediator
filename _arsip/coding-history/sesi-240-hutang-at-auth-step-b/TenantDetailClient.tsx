'use client'

// app/dashboard/superadmin/tenants/[id]/TenantDetailClient.tsx
// PRE-EDIT ARSIP S#240 — sebelum STEP B (ganti import TabPICHistory → TabAdminTenantHistory)
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

interface Props { tenant: Tenant }

export function TenantDetailClient({ tenant: initialTenant }: Props) {
  const [tenant,    setTenant]    = useState<Tenant>(initialTenant)
  const [activeTab, setActiveTab] = useState<TenantTabId>('info')

  const handleRefresh = async () => {
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}`)
      const json = await res.json()
      if (json.success) setTenant(json.data)
    } catch { /* silent */ }
  }

  const quickStats = {
    kategori_aktif:   0,
    user_aktif:       0,
    user_quota:       tenant.tier === 'starter' ? 5 : tenant.tier === 'growth' ? 15 : 9999,
    kontrak_berakhir: tenant.contract_end_date ?? null,
    auto_renewal:     tenant.auto_renewal,
  }

  const handleSuspend   = () => { /* TODO */ }
  const handleTerminate = () => { /* TODO */ }

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-6">
        <TenantDetailHeader
          tenant={tenant}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSuspend={handleSuspend}
          onTerminate={handleTerminate}
          quickStats={quickStats}
        />
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
