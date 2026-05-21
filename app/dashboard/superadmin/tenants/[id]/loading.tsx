'use client'

// app/dashboard/superadmin/tenants/[id]/loading.tsx
// Skeleton instan untuk halaman Detail Tenant — 6 tab placeholder.
//
// Dibuat: Sesi #198 — Step 6.3b PIVOT loading.tsx sub-route
//   Gap: TenantDetailPage adalah async RSC (TenantService_getById + force-dynamic)
//   User sebelumnya melihat blank screen saat navigasi ke /tenants/[id].
//
// Layout mengikuti TenantDetailClient:
//   - Header: nama tenant + tier badge + status + tombol Edit
//   - 6 tab: Info Umum | Kategori | PIC History | Kontrak Sewa | Override Config | User Tenant
//   - Tab content: form fields placeholder

export default function TenantDetailLoading() {
  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* Header tenant — nama + tier + status + tombol */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-slate-200 rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
            <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="h-9 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

      {/* 6 Tab headers */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {[120, 100, 110, 130, 140, 110].map((w, i) => (
            <div
              key={i}
              className={`h-9 rounded-t animate-pulse shrink-0 ${i === 0 ? 'bg-slate-300' : 'bg-slate-200'}`}
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
      </div>

      {/* Tab content — Info Umum placeholder (default tab) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />

        {/* 2-column form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* 1 full-width field (misal: alamat) */}
        <div className="space-y-2">
          <div className="h-3.5 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-20 w-full bg-slate-200 rounded animate-pulse" />
        </div>

        {/* Submit button area */}
        <div className="flex justify-end pt-2">
          <div className="h-9 w-28 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

    </div>
  )
}
