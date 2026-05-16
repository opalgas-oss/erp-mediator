// app/dashboard/superadmin/tenants/page.tsx
// Halaman List Tenants — SuperAdmin Dashboard (BAB 8.1 PAGE_SPEC_SUPERADMIN_v2)
// RSC: fetch data awal → pass ke TenantsClient
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

export const dynamic = 'force-dynamic'

import { TenantService_list } from '@/lib/services/tenant.service'
import { TenantsClient }      from './TenantsClient'

export default async function TenantsPage() {
  try {
    const result = await TenantService_list({ page: 1, limit: 20 })

    return (
      <TenantsClient
        initialData={result.data}
        initialTotal={result.total}
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
