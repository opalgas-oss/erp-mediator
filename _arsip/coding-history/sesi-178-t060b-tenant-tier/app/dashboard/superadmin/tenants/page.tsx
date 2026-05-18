// app/dashboard/superadmin/tenants/page.tsx — PRE-FIX T-060b S#178
// Snapshot sebelum: tambah fetch M4 tenant_tipe options + pass tierOpsi ke TenantsClient
// Dibuat: Sesi #132. Diupdate: Sesi #159 — T-062: fetch statusTabs dari M4.

export const dynamic = 'force-dynamic'

import { TenantService_list }                        from '@/lib/services/tenant.service'
import { MasterDropdownService_getOptionsByGroupSlug } from '@/lib/services/master-dropdown-group.service'
import { TenantsClient }                              from './TenantsClient'
import type { TenantLifecycleStatus }                 from '@/lib/types/tenant.types'

export default async function TenantsPage() {
  try {
    const [result, tenantStatusOpsi] = await Promise.all([
      TenantService_list({ page: 1, limit: 20 }),
      MasterDropdownService_getOptionsByGroupSlug('tenant_status'),
    ])
    // PRE-FIX: tierOpsi TIDAK difetch — Dialog pakai hardcode atau default saja
    const statusTabs: { value: TenantLifecycleStatus | 'all'; label: string }[] = [
      { value: 'all', label: 'Semua' },
      ...tenantStatusOpsi
        .filter(o => o.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(o => ({ value: (o.string_value ?? o.slug) as TenantLifecycleStatus, label: o.label })),
    ]
    return <TenantsClient initialData={result.data} initialTotal={result.total} statusTabs={statusTabs} />
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
