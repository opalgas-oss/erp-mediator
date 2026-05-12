// app/dashboard/superadmin/roles/[id]/loading.tsx
// Skeleton loading halaman Detail Role — dua panel side-by-side.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { Skeleton } from '@/components/ui/skeleton'

export default function RoleDetailLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-14 w-full rounded-md" />
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="rounded-md border p-4 space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-20" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
