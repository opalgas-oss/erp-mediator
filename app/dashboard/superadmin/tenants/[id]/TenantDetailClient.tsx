'use client'

// app/dashboard/superadmin/tenants/[id]/TenantDetailClient.tsx
// Orchestrator Detail Tenant — header persisten + 6 tab
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { Badge }       from '@/components/ui/badge'
import { Button }      from '@/components/ui/button'
import { TabInfoUmum }      from './TabInfoUmum'
import { TabKontrakSewa }   from './TabKontrakSewa'
import { TabKategori }      from './TabKategori'
import { TabPICHistory }    from './TabPICHistory'
import { TabUserTenant }    from './TabUserTenant'
import { TabOverrideConfig } from './TabOverrideConfig'
import type { Tenant, TenantLifecycleStatus } from '@/lib/types/tenant.types'
import { TENANT_LIFECYCLE_LABEL, TENANT_TIER_LABEL } from '@/lib/constants/tenant.constant'

// ─── Tipe tab ─────────────────────────────────────────────────────────────────

type TabId = 'info' | 'kontrak' | 'kategori' | 'pic' | 'user' | 'config'

const TABS: { id: TabId; label: string }[] = [
  { id: 'info',     label: 'Info Umum' },
  { id: 'kontrak',  label: 'Kontrak Sewa' },
  { id: 'kategori', label: 'Kategori' },
  { id: 'pic',      label: 'PIC & Riwayat' },
  { id: 'user',     label: 'User Tenant' },
  { id: 'config',   label: 'Override Config' },
]

// ─── Status badge color ───────────────────────────────────────────────────────

const STATUS_VARIANT: Record<TenantLifecycleStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active:     'default',
  pending:    'secondary',
  suspended:  'outline',
  expired:    'outline',
  terminated: 'destructive',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { tenant: Tenant }

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function TenantDetailClient({ tenant: initialTenant }: Props) {
  const router = useRouter()
  const [tenant,  setTenant]  = useState<Tenant>(initialTenant)
  const [activeTab, setActiveTab] = useState<TabId>('info')

  // Refresh data setelah ada perubahan di tab
  const handleRefresh = async () => {
    try {
      const res  = await fetch(`/api/superadmin/tenants/${tenant.id}`)
      const json = await res.json()
      if (json.success) setTenant(json.data)
    } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col min-h-0">

      {/* Header Persisten */}
      <div className="border-b bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* Breadcrumb */}
            <button
              onClick={() => router.push('/dashboard/superadmin/tenants')}
              className="text-xs text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1"
            >
              ← Tenant
            </button>

            {/* Nama + badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-semibold truncate">{tenant.nama_brand}</h1>
              <Badge variant={STATUS_VARIANT[tenant.status]}>
                {TENANT_LIFECYCLE_LABEL[tenant.status]}
              </Badge>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {TENANT_TIER_LABEL[tenant.tier]}
              </span>
            </div>

            {/* Sub-info */}
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              {tenant.tenant_display_id && <span>{tenant.tenant_display_id}</span>}
              {tenant.slug && <span className="font-mono">{tenant.slug}</span>}
              {tenant.tipe && <span className="capitalize">{tenant.tipe}</span>}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-0 mt-4 border-b -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'info'     && <TabInfoUmum     tenant={tenant} onRefresh={handleRefresh} />}
        {activeTab === 'kontrak'  && <TabKontrakSewa  tenant={tenant} onRefresh={handleRefresh} />}
        {activeTab === 'kategori' && <TabKategori     tenantId={tenant.id} />}
        {activeTab === 'pic'      && <TabPICHistory   tenantId={tenant.id} />}
        {activeTab === 'user'     && <TabUserTenant   tenantId={tenant.id} tier={tenant.tier} />}
        {activeTab === 'config'   && <TabOverrideConfig tenantId={tenant.id} />}
      </div>
    </div>
  )
}
