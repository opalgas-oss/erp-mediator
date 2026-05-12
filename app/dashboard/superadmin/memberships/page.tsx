// app/dashboard/superadmin/memberships/page.tsx
// Halaman List Memberships — SuperAdmin Dashboard.
// RSC: fetch initial data (50 rows, no filter) → pass ke MembershipsClient.
//
// Filter (search, tenant_id, role_id, status) dan pagination dikerjakan
// oleh MembershipsClient via fetch ke API route.
//
// Dibuat: Sesi #136 — M8 User Membership Management

export const dynamic = 'force-dynamic'

import { MembershipService_listMemberships } from '@/lib/services/membership.service'
import { MembershipsClient }                 from './MembershipsClient'

export default async function MembershipsPage() {
  try {
    const initialData = await MembershipService_listMemberships({
      status:   'all',
      page:     1,
      per_page: 50,
    })
    return <MembershipsClient initialData={initialData} />
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data memberships. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
