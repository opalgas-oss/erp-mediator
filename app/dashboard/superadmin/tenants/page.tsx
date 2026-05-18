// app/dashboard/superadmin/tenants/page.tsx
// Halaman List Tenants — SuperAdmin Dashboard (BAB 8.1 PAGE_SPEC_SUPERADMIN_v2)
// RSC: fetch data awal → pass ke TenantsClient
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7
// Diupdate: Sesi #159 — T-062: fetch statusTabs dari M4 (tenant_status grup)
//   Menggantikan STATUS_TABS hardcode di TenantsClient.
//   Label + urutan tab kini dikontrol SuperAdmin via M4 Master Dropdown.

export const dynamic = 'force-dynamic'

import { TenantService_list }                        from '@/lib/services/tenant.service'
import { MasterDropdownService_getOptionsByGroupSlug } from '@/lib/services/master-dropdown-group.service'
import { TenantsClient }                              from './TenantsClient'
import type { TenantLifecycleStatus, TenantTier }     from '@/lib/types/tenant.types'

export default async function TenantsPage() {
  try {
    const [result, tenantStatusOpsi, tenantTierOpsi] = await Promise.all([
      TenantService_list({ page: 1, limit: 20 }),
      MasterDropdownService_getOptionsByGroupSlug('tenant_status'),
      // FIX T-060b S#178: fetch tier opsi dari M4 tenant_tipe (starter/growth/enterprise)
      MasterDropdownService_getOptionsByGroupSlug('tenant_tipe'),
    ])

    // Build status tabs dari M4 — "Semua" selalu di depan (bukan dari dropdown)
    const statusTabs: { value: TenantLifecycleStatus | 'all'; label: string }[] = [
      { value: 'all', label: 'Semua' },
      ...tenantStatusOpsi
        .filter(o => o.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(o => ({
          value: (o.string_value ?? o.slug) as TenantLifecycleStatus,
          label: o.label,
        })),
    ]

    // Build tier opsi dari M4 tenant_tipe — align ke TenantTier (starter/growth/enterprise)
    const tierOpsi: { value: TenantTier; label: string }[] = tenantTierOpsi
      .filter(o => o.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(o => ({
        value: (o.string_value ?? o.slug) as TenantTier,
        label: o.label,
      }))

    return (
      <TenantsClient
        initialData={result.data}
        initialTotal={result.total}
        statusTabs={statusTabs}
        tierOpsi={tierOpsi}
      />
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data tenant. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
