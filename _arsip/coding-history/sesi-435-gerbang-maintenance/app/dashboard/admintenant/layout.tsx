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
import AdminTenantSidebarLoader, {
  AdminTenantSidebarSkeleton,
}                                from '@/components/admintenant/AdminTenantSidebarLoader'

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
