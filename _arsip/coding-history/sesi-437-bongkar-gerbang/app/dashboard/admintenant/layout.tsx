// app/dashboard/admintenant/layout.tsx
// Layout utama Dashboard AdminTenant.
//
// POLA: mengikuti pola layout SA (DashboardShell + Suspense sidebar).
// Auth gate: verifyJWT() → role === admin_tenant (via ROLES constant).
// Sidebar: AdminTenantSidebarNav (komponen terpisah, dark sidebar #1a1a1a).
// Dibuat: 10 Juni 2026 — CASE SESI-26 (A-F7 skeleton Dashboard AT)
// Acuan: ACUAN_MOCKUP_DASHBOARD_AT_v1.md

import { Suspense }              from 'react'
import { redirect }              from 'next/navigation'
import { verifyJWT }             from '@/lib/auth-server'
import { getMessagesByKategori } from '@/lib/message-library'
import { cekSesiParalel }        from '@/app/login/login-session-check'
import { ROLES }                 from '@/lib/constants'
import { DashboardShell }        from '@/components/DashboardShell'
import { gerbangMaintenance }    from '@/components/maintenance/MaintenanceGate'
import { MaintenanceView }       from '@/components/maintenance/MaintenanceView'
import AdminTenantSidebarLoader, {
  AdminTenantSidebarSkeleton,
}                                from '@/components/admintenant/AdminTenantSidebarLoader'

// Gerbang maintenance membaca `config_registry` tiap permintaan ⇒ layout ini tidak boleh
// di-prerender statis. Pola yang sama dengan layout Vendor dan `app/page.tsx` (fix build S#412).
export const dynamic = 'force-dynamic'

async function fetchMessages(): Promise<Record<string, string>> {
  try {
    const messages = await getMessagesByKategori(['sidebar_ui', 'page_ui', 'header_ui'])
    return messages ?? {}
  } catch {
    return {}
  }
}

export default async function AdminTenantLayout({ children }: { children: React.ReactNode }) {
  // Auth gate — cek role admin_tenant
  const payload = await verifyJWT()
  if (!payload || payload.role !== ROLES.ADMIN_TENANT) {
    redirect('/kelola/masuk')
  }

  // Gerbang maintenance — BARU S#435. Sebelum sesi ini Dashboard AdminTenant adalah SATU-SATUNYA
  // permukaan yang §4 A1 tandai DIBLOK tetapi tidak punya gerbang sama sekali: saat SA menyalakan
  // maintenance, AT tetap masuk dan bekerja di sistem yang sedang diperbaiki.
  //
  // Letaknya SESUDAH pemeriksaan auth dan SEBELUM dua query di bawah — urutan yang sama persis
  // dengan layout Vendor. Keputusannya sendiri tidak dihitung di sini: ia milik
  // `gerbangMaintenance()`, satu-satunya tempat pertanyaan "permukaan ini diblok atau tidak"
  // dijawab (§4 A2 koreksi 1.4.1).
  //
  // `area="admin_tenant"` — GARIS BAWAH, nilai kolom `app_error_log.area`, BUKAN nama folder route
  // `admintenant`. Keduanya memang berbeda dan perbedaan itu sudah pernah memakan korban (BUG-039).
  const gerbang = await gerbangMaintenance('admin_tenant')
  if (gerbang) return <MaintenanceView data={gerbang} area="admin_tenant" />

  const [messages, hasilCekSesi] = await Promise.all([
    fetchMessages(),
    cekSesiParalel(payload.uid, payload.tenantId, ROLES.ADMIN_TENANT),
  ])

  const sesiParalel = hasilCekSesi.adaSesi ? hasilCekSesi.sesiData : undefined

  return (
    <DashboardShell
      sidebar={
        <Suspense fallback={<AdminTenantSidebarSkeleton />}>
          <AdminTenantSidebarLoader
            tenantId={payload.tenantId}
            messages={messages}
          />
        </Suspense>
      }
      messages={messages}
      sesiParalel={sesiParalel}
    >
      {children}
    </DashboardShell>
  )
}
