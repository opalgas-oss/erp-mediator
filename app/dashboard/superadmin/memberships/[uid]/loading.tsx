// app/dashboard/superadmin/memberships/[uid]/loading.tsx
// Skeleton loading untuk halaman Detail User Membership.
//
// Dibuat: Sesi #136 — M8 User Membership Management

import { Skeleton } from '@/components/ui/skeleton'

export default function MembershipDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Back button + header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-7 w-56" />
      </div>

      {/* Card info user skeleton */}
      <div className="rounded-md border p-5 space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Membership table skeleton */}
      <div className="rounded-md border">
        <div className="p-4 border-b flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full ml-auto" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
