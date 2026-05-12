// app/dashboard/superadmin/roles/[id]/page.tsx
// Halaman Detail Role + Permissions — SuperAdmin Dashboard.
// RSC: fetch role detail (assigned + available permissions) via service.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

export const dynamic = 'force-dynamic'

import { notFound }                       from 'next/navigation'
import { RolesService_getRoleDetail }     from '@/lib/services/roles.service'
import { RoleDetailClient }              from './RoleDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RoleDetailPage({ params }: Props) {
  const { id } = await params
  const roleId = parseInt(id, 10)
  if (isNaN(roleId)) notFound()

  try {
    const role = await RolesService_getRoleDetail(roleId)
    if (!role) notFound()

    return <RoleDetailClient role={role} />
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data role. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
