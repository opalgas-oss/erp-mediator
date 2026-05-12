// app/dashboard/superadmin/roles/page.tsx
// Halaman List Roles — SuperAdmin Dashboard.
// RSC: fetch 4 role + permission count via service, render ke RolesClient.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

export const dynamic = 'force-dynamic'

import { RolesService_listRoles } from '@/lib/services/roles.service'
import { RolesClient }            from './RolesClient'

export default async function RolesPage() {
  try {
    const roles = await RolesService_listRoles()
    return <RolesClient initialData={roles} />
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data roles. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
