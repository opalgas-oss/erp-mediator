// Otomatis tampil saat config/page.tsx (Server Component) sedang fetch data Firestore
export default function LoadingConfigPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-8 pt-6 pb-4 bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50">
        <div className="h-7 w-48 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto px-8 pb-4 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-slate-200 rounded-lg bg-white shadow-sm p-4 space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-10 w-full bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
