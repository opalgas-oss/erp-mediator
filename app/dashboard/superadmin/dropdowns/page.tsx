// app/dashboard/superadmin/dropdowns/page.tsx
// Halaman Master Dropdown — SuperAdmin Dashboard.
// Load semua grup beserta opsinya via Service layer, render ke client component.
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.6

export const dynamic = 'force-dynamic'

import { MasterDropdownService_listGroupsWithOptions } from '@/lib/services/master-dropdown-group.service'
import { DropdownGroupsClient }                        from './DropdownGroupsClient'

export default async function MasterDropdownPage() {
  try {
    const grupList = await MasterDropdownService_listGroupsWithOptions()

    return (
      <DropdownGroupsClient initialData={grupList} />
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data dropdown. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
