// app/dashboard/superadmin/roles/loading.tsx
// Skeleton loading untuk halaman List Roles.
// Muncul otomatis via Next.js App Router Suspense boundary.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { Skeleton } from '@/components/ui/skeleton'

export default function RolesLoading() {
  return (
    <div className="p-6 space-y-4">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Alert info skeleton */}
      <Skeleton className="h-12 w-full rounded-md" />

      {/* Table skeleton — 4 role (fixed) */}
      <div className="rounded-md border">
        <div className="p-4 border-b">
          <Skeleton className="h-5 w-32" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-36 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
