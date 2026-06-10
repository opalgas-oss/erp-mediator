// app/dashboard/admintenant/page.tsx
// Halaman Beranda Dashboard AdminTenant.
//
// Saat ini: placeholder skeleton sesuai ACUAN_MOCKUP_DASHBOARD_AT_v1.md Bab 6.
// To-do: implementasi 5 KPI cards + grafik tren + to-do + vendor perlu perhatian.
// Dibuat: 10 Juni 2026 — CASE SESI-26 (A-F7 skeleton Dashboard AT)

import { redirect }  from 'next/navigation'
import { verifyJWT } from '@/lib/auth-server'
import { ROLES }     from '@/lib/constants'

export default async function AdminTenantBerandaPage() {
  const payload = await verifyJWT()
  if (!payload || payload.role !== ROLES.ADMIN_TENANT) {
    redirect('/kelola/masuk')
  }

  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--color-info-bg)' }}>
          <i className="ti ti-home-2 text-3xl" style={{ color: 'var(--color-info-text)' }} />
        </div>
        <div>
          <p className="text-[20px] font-semibold text-[#1f2937]">Beranda</p>
          <p className="text-[12px] text-[#6b7280] mt-1 max-w-sm">
            Pantau aktivitas operasional, lelang berjalan, dan vendor yang perlu perhatian di wilayah Anda.
          </p>
        </div>
        <div className="mt-2 text-[12px] text-[#9ca3af] px-4 py-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.04)' }}>
          Widget KPI dan grafik sedang dalam pengembangan.
        </div>
      </div>
    </div>
  )
}
