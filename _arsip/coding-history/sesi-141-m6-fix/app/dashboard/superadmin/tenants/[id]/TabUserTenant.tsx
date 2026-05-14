'use client'

// app/dashboard/superadmin/tenants/[id]/TabUserTenant.tsx
// Tab User Tenant — daftar user + quota bar
// CATATAN: Implementasi penuh menunggu M8 (User Membership).
// Sesi #132: placeholder UI dengan info tier quota.

import { Badge }   from '@/components/ui/badge'
import type { TenantTier } from '@/lib/types/tenant.types'
import { TENANT_TIER_LABEL } from '@/lib/constants/tenant.constant'

interface Props { tenantId: string; tier: TenantTier }

const TIER_QUOTA: Record<TenantTier, number> = {
  starter:    5,
  growth:    20,
  enterprise: 100,
}

export function TabUserTenant({ tenantId: _tenantId, tier }: Props) {
  const quota = TIER_QUOTA[tier]

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Kuota User Tenant</h3>
          <Badge variant="secondary">{TENANT_TIER_LABEL[tier]}</Badge>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span>Terpakai</span>
            <span className="text-muted-foreground">0 / {quota} user</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium mb-1">Fitur User Tenant</p>
        <p>Manajemen user tenant akan tersedia setelah M8 (User Membership) selesai dikerjakan.</p>
      </div>
    </div>
  )
}
