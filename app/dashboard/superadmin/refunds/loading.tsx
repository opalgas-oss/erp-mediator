// app/dashboard/superadmin/refunds/loading.tsx
// Skeleton loading untuk halaman Approval Refund SuperAdmin.
// Muncul otomatis via Next.js App Router Suspense boundary.
//
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin

import { Skeleton } from '@/components/ui/skeleton'

export default function RefundsLoading() {
  return (
    <div className="p-6 space-y-4">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Table skeleton — 6 rows */}
      <div className="rounded-md border">
        <div className="p-4 border-b">
          <Skeleton className="h-5 w-48" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2 ml-auto">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
