// components/superadmin/SidebarDataLoader.tsx
//
// DIBUAT Sesi #145 — BUG-015 Tahap 2 (RSC Cold Start fix).
//
// SERVER COMPONENT — fetch brandName + config TTL di luar layout body.
// Di-wrap <Suspense> di layout SA sehingga:
//   - Initial HTML shell bisa di-stream SEBELUM fetch ini selesai
//   - getBrandName() (DB query) tidak blocking TTFB layout
//
// Props messages + featureKeys diterima dari layout body (sudah di-fetch
// di sana karena DashboardHeader juga butuhnya).
//
// Skeleton: SidebarSkeleton — matching dimensi sidebar aktual (w-64, h-screen).

import { getBrandName }  from '@/lib/dashboard-data'
import { getConfigValue } from '@/lib/config-registry'
import { SidebarNav }    from '@/components/SidebarNav'

// ─── Skeleton matching sidebar dimensi ───────────────────────────────────────

export function SidebarSkeleton() {
  return (
    <div className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">

      {/* Brand name area */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
      </div>

      {/* Nav items */}
      <div className="flex-1 px-4 py-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="h-4 w-4 bg-slate-200 rounded animate-pulse shrink-0" />
            <div
              className="h-4 bg-slate-200 rounded animate-pulse"
              style={{ width: `${55 + i * 7}%` }}
            />
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
  )
}

// ─── SidebarDataLoader ────────────────────────────────────────────────────────

interface SidebarDataLoaderProps {
  messages:    Record<string, string>
  featureKeys: string[]
}

export default async function SidebarDataLoader({
  messages,
  featureKeys,
}: SidebarDataLoaderProps) {
  const [ttlStr, brandName] = await Promise.all([
    getConfigValue('platform_general', 'sidebar_cache_ttl_seconds', '1800'),
    getBrandName(),
  ])

  // TTL tersimpan untuk referensi — akan diaktifkan saat unstable_cache diterapkan
  const _revalidate = Number(ttlStr) || 1800

  return (
    <SidebarNav
      brandName={brandName}
      messages={messages}
      featureKeys={featureKeys}
    />
  )
}
