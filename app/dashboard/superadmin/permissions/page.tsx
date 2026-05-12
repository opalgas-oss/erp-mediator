// app/dashboard/superadmin/permissions/page.tsx
// Halaman List Permissions — SuperAdmin Dashboard.
// RSC: fetch semua permission + role yang punya via service.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

export const dynamic = 'force-dynamic'

import { PermissionsService_listPermissions } from '@/lib/services/permissions.service'
import { PermissionsClient }                 from './PermissionsClient'

export default async function PermissionsPage() {
  try {
    const permissions = await PermissionsService_listPermissions()
    return <PermissionsClient initialData={permissions} />
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data permissions. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
