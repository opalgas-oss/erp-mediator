'use client'

// app/dashboard/superadmin/dropdowns/loading.tsx
// Skeleton instan untuk halaman Master Dropdown — table rows placeholder.
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.6

export default function DropdownsLoading() {
  return (
    <div className="p-4 lg:p-6 space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
      </div>

      {/* Category tab filter */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-28 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50">
          {[70, 140, 90, 80, 60, 60].map((w, i) => (
            <div key={i} className="h-3.5 bg-slate-200 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-slate-100">
            <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
            <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: '80%' }} />
            <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
            <div className="h-4 w-10 bg-slate-200 rounded animate-pulse" />
            <div className="h-5 w-12 bg-slate-200 rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

    </div>
  )
}
