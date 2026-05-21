'use client'

// app/dashboard/superadmin/categories/loading.tsx
// Skeleton instan untuk halaman List Kategori — table rows placeholder.
//
// Dibuat: Sesi #198 — Step 6.3b PIVOT loading.tsx sub-route
//   Gap: CategoriesPage adalah async RSC (CategoryService_list + force-dynamic)
//   User sebelumnya melihat blank screen saat navigasi ke /categories.
//
// Layout mengikuti CategoriesClient:
//   - Header: judul + tombol "Tambah Kategori"
//   - Stats row: total / aktif / nonaktif
//   - Table: Nama | Slug | Tenant Aktif | Vendor | Status | Aksi

export default function CategoriesLoading() {
  return (
    <div className="p-4 lg:p-6 space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="h-9 w-40 bg-slate-200 rounded animate-pulse" />
      </div>

      {/* Stats row — 3 kartu ringkasan */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
            <div className="h-3.5 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-6 w-10 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-3.5 bg-slate-200 rounded animate-pulse" style={{ width: `${60 + i * 5}%` }} />
          ))}
        </div>

        {/* Table rows — 7 placeholder */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-slate-100 last:border-b-0">
            {/* Nama */}
            <div className="h-4 bg-slate-200 rounded animate-pulse w-4/5" />
            {/* Slug */}
            <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
            {/* Tenant Aktif */}
            <div className="h-4 w-8 bg-slate-200 rounded animate-pulse" />
            {/* Vendor */}
            <div className="h-4 w-8 bg-slate-200 rounded animate-pulse" />
            {/* Status */}
            <div className="h-5 w-14 bg-slate-200 rounded-full animate-pulse" />
            {/* Aksi */}
            <div className="flex gap-2">
              <div className="h-7 w-7 bg-slate-200 rounded animate-pulse" />
              <div className="h-7 w-7 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
