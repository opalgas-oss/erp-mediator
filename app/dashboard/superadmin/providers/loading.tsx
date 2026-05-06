// app/dashboard/superadmin/providers/loading.tsx
// Skeleton loading untuk halaman API Provider & Credential.
// Next.js App Router otomatis pakai file ini sebagai Suspense boundary.
// Dibuat: Sesi #107 — M3 Credential Management

export default function ProvidersLoading() {
  return (
    <div className="p-4 sm:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-3 w-64 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Split view skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel kiri — daftar provider */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className="h-4 w-4 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-2 w-16 bg-slate-100 rounded" />
              </div>
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>

        {/* Panel kanan — instances */}
        <div className="lg:col-span-2 rounded-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-6 w-28 bg-slate-200 rounded" />
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="h-4 w-48 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
