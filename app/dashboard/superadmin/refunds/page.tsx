// app/dashboard/superadmin/refunds/page.tsx
// Halaman Approval Refund SuperAdmin — M9.
// RSC: fetch initial data (20 rows, status awaiting_super_admin) → pass ke RefundsClient.
//
// Filter (search, tenant_id) dan pagination dikerjakan
// oleh RefundsClient via fetch ke API route.
//
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin

export const dynamic = 'force-dynamic'

import { ComplaintService_listRefunds } from '@/lib/services/complaint.service'
import { RefundsClient }                from './RefundsClient'

export default async function RefundsPage() {
  try {
    const initialData = await ComplaintService_listRefunds({
      page:     1,
      per_page: 20,
    })
    return <RefundsClient initialData={initialData} />
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data approval refund. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
