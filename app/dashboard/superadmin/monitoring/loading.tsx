'use client'

// app/dashboard/superadmin/monitoring/loading.tsx
// Skeleton instan untuk halaman Monitoring Dashboard.
//
// Dibuat: Sesi #198 — Step 6.3b PIVOT loading.tsx sub-route
//   Gap: MonitoringPage adalah async RSC (4× Promise.all + force-dynamic)
//   User sebelumnya melihat blank screen saat navigasi ke /monitoring.
//
// Layout mengikuti MonitoringClient:
//   - Header: judul + tombol Rules + Config
//   - 3 summary cards (Status Sistem / Alert Aktif / Update)
//   - Provider badges grid
//   - Uptime summary table
//   - Alert log table

export default function MonitoringLoading() {
  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* Header row — judul + tombol Rules + Config */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

      {/* 3 Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Provider badges grid — 6 icon placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-100">
              <div className="h-10 w-10 bg-slate-200 rounded-full animate-pulse" />
              <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Uptime summary table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
        </div>
        {/* Table header */}
        <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3.5 bg-slate-200 rounded animate-pulse w-4/5" />
          ))}
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-5 py-3.5 border-b border-slate-100 last:border-b-0">
            <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-slate-200 rounded animate-pulse w-2/3" />
            <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
            <div className="h-4 bg-slate-200 rounded animate-pulse w-4/5" />
            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

    </div>
  )
}
