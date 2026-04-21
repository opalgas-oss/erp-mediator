// app/dashboard/vendor/layout.tsx
// Layout proteksi untuk semua halaman /dashboard/vendor
//
// Pola: identik dengan superadmin/layout.tsx
//   - verifyJWT() untuk full crypto verify
//   - Cek role === 'VENDOR' — selain itu redirect ke /login
//   - Middleware sudah pre-screen via DASHBOARD_ROLE_MAP, layout ini double-check server-side
//
// Catatan Sprint 3:
//   - DashboardShell (sidebar + nav) untuk Vendor belum diimplementasi
//   - Layout ini minimal — akan diperluas saat Sprint 3 dimulai

export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { verifyJWT }    from '@/lib/auth-server'

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
