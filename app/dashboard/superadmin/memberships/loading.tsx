// app/dashboard/superadmin/memberships/loading.tsx
// Skeleton loading untuk halaman List Memberships.
// Muncul otomatis via Next.js App Router Suspense boundary.
//
// Dibuat: Sesi #136 — M8 User Membership Management

import { Skeleton } from '@/components/ui/skeleton'

export default function MembershipsLoading() {
  return (
    <div className="p-6 space-y-4">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Table skeleton — 8 rows */}
      <div className="rounded-md border">
        <div className="p-4 border-b">
          <Skeleton className="h-5 w-40" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full ml-auto" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
