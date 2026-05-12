// app/dashboard/superadmin/permissions/loading.tsx
// Skeleton loading halaman List Permissions.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { Skeleton } from '@/components/ui/skeleton'

export default function PermissionsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 border-b">
          <Skeleton className="h-5 w-40" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
