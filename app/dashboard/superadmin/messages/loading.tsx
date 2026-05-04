// app/dashboard/superadmin/messages/loading.tsx
// Skeleton loading untuk halaman Message Library.
// Next.js App Router otomatis pakai file ini sebagai Suspense boundary.
//
// Dibuat: Sesi #098 — PL-S08 M2 Message Library

export default function MessageLibraryLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-slate-200 rounded" />
          <div className="h-3 w-56 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-28 bg-slate-200 rounded" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex gap-2">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="h-8 w-48 bg-slate-200 rounded" />
      </div>

      {/* Tabel skeleton */}
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 flex gap-4">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="h-3 w-40 bg-slate-200 rounded" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-slate-100 flex items-center gap-4">
            <div className="h-3 w-48 bg-slate-200 rounded font-mono" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
            <div className="h-3 flex-1 bg-slate-100 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-6 w-10 bg-slate-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
