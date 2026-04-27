// app/dashboard/superadmin/loading.tsx
// Skeleton instan untuk SuperAdmin dashboard — ditampilkan SEBELUM server query DB apapun.
//
// DIBUAT Sesi #067 — Fix Loading Performance:
//   Pola: Next.js loading.tsx (built on React Suspense).
//   Referensi: nextjs.org/learn/dashboard-app/streaming + Vercel Academy.
//   loading.tsx di-serve langsung dari CDN — zero DB query, zero server wait.
//   User lihat skeleton ini instan, konten real stream masuk setelahnya.
//
// Dimensi skeleton mengikuti DashboardShell:
//   - Sidebar: w-64 (256px) di desktop, hidden di mobile
//   - Header:  h-16 (64px)
//   - Main:    sisa area

export default function SuperAdminLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar Skeleton ──────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">

        {/* Brand name */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
        </div>

        {/* Nav items */}
        <div className="flex-1 px-4 py-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
              <div className="h-4 w-4 bg-slate-200 rounded animate-pulse shrink-0" />
              <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${55 + i * 7}%` }} />
            </div>
          ))}
        </div>

        {/* User info bawah */}
        <div className="px-4 py-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Konten Kanan ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header Skeleton */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          {/* Hamburger (mobile) */}
          <div className="h-8 w-8 bg-slate-200 rounded animate-pulse lg:hidden" />
          {/* Judul halaman */}
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          {/* Avatar + dropdown */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
            <div className="h-4 w-4 bg-slate-200 rounded animate-pulse hidden lg:block" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 overflow-hidden p-4 lg:p-6">

          {/* Baris atas — 3 kartu stat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-7 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Baris bawah — 1 panel lebar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-3.5 bg-slate-200 rounded animate-pulse flex-1" />
                  <div className="h-3.5 w-16 bg-slate-200 rounded animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
