// app/dashboard/superadmin/settings/multi-role-policy/loading.tsx
// Loading state untuk halaman Multi-Role Policy
// Dibuat: Sesi #097 — PL-S08 M1

export default function Loading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-8 pt-4 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/80 border border-slate-200 rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-8 bg-slate-100 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
