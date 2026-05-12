// app/dashboard/superadmin/tenants/[id]/page.tsx
// Halaman Detail Tenant — 6 tab (BAB 8.2 PAGE_SPEC_SUPERADMIN_v2)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.7

export const dynamic = 'force-dynamic'

import { notFound }              from 'next/navigation'
import { TenantService_getById } from '@/lib/services/tenant.service'
import { TenantDetailClient }    from './TenantDetailClient'

type Props = { params: Promise<{ id: string }> }

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params

  try {
    const tenant = await TenantService_getById(id)
    if (!tenant) notFound()

    return <TenantDetailClient tenant={tenant} />

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
