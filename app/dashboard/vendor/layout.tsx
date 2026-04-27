// app/dashboard/vendor/layout.tsx
//
// PERUBAHAN Sesi #067 — Loading Skeleton (Streaming):
//   SEBELUM: layout async blocking — verifyJWT + DB query + getBrandName semua di-await
//            sebelum render apapun. User lihat blank screen ~700ms.
//   SESUDAH: layout pure static wrapper dengan <Suspense fallback={<VendorLoading />}>
//            di sekitar VendorShellWithData (async).
//            User langsung lihat skeleton (0ms), konten stream masuk setelah server selesai.
//
//   Referensi: nextjs.org/learn/dashboard-app/streaming + Vercel Academy.
//   Pattern: pisah layout menjadi static shell wrapper + async data fetcher.
//
// ARSIP file lama: _arsip/coding-history/sesi-067-loading-skeleton/app/dashboard/vendor/layout.tsx

import { Suspense }    from 'react'
import VendorLoading   from './loading'
import VendorShellWithData from './VendorShellWithData'

// Layout ini TIDAK punya export dynamic = 'force-dynamic'
// dan TIDAK mengakses runtime APIs (headers, cookies).
// VendorShellWithData yang async → otomatis dynamic.
// Ini yang membuat <Suspense fallback> bisa trigger segera.

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<VendorLoading />}>
      <VendorShellWithData>{children}</VendorShellWithData>
    </Suspense>
  )
}
