'use client'

// app/dashboard/superadmin/tenants/loading.tsx
// Skeleton instan untuk halaman List Tenant — table rows placeholder.
//
// Dibuat: Sesi #198 — Step 6.3b PIVOT loading.tsx sub-route
//   Gap: TenantsPage adalah async RSC (3× Promise.all + force-dynamic)
//   User sebelumnya melihat blank screen saat navigasi ke /tenants.
//   loading.tsx di-serve instan via Suspense sebelum RSC selesai fetch.
//
// Layout mengikuti TenantsClient:
//   - Header: judul + tombol "Tambah Tenant"
//   - Status tabs: Semua / Aktif / dll
//   - Search + filter row
//   - Table: Nama Brand | Slug | Tier | Status | PIC | Dibuat

export default function TenantsLoading() {
  return (
    <div className="p-4 lg:p-6 space-y-4">

      {/* Header row — judul + tombol tambah */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="h-9 w-36 bg-slate-200 rounded animate-pulse" />
      </div>

      {/* Status tab filter */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-3">
        <div className="h-9 flex-1 bg-slate-200 rounded animate-pulse max-w-xs" />
        <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50">
          {[160, 120, 80, 80, 120, 90].map((w, i) => (
            <div key={i} className="h-3.5 bg-slate-200 rounded animate-pulse" style={{ width: `${Math.min(w, 100)}%` }} />
          ))}
        </div>

        {/* Table rows — 6 placeholder */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-slate-100 last:border-b-0">
            {/* Nama Brand */}
            <div className="space-y-1.5">
              <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
            </div>
            {/* Slug */}
            <div className="h-4 bg-slate-200 rounded animate-pulse w-4/5" />
            {/* Tier */}
            <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
            {/* Status */}
            <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
            {/* PIC */}
            <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
            {/* Dibuat */}
            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

    </div>
  )
}
