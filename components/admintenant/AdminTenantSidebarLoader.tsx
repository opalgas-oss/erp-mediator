// components/admintenant/AdminTenantSidebarLoader.tsx
// RSC loader untuk sidebar AT — di-wrap Suspense di layout.
//
// Fetch: nama tenant + nama user + jabatan user dari Supabase.
// Skeleton: matching dimensi sidebar AT (w-64, h-screen, bg #1a1a1a).
// Dibuat: 10 Juni 2026 — CASE SESI-26 (A-F7 skeleton Dashboard AT)

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AdminTenantSidebarNav }      from '@/components/admintenant/AdminTenantSidebarNav'
import { verifyJWT }                  from '@/lib/auth-server'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AdminTenantSidebarSkeleton() {
  return (
    <div className="hidden lg:flex flex-col w-64 h-screen shrink-0"
      style={{ background: '#1a1a1a' }}>
      <div className="h-16 flex items-center px-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="h-4 w-36 rounded animate-pulse"
          style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>
      <div className="flex-1 p-3 space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 rounded-lg animate-pulse"
            style={{ background: 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Loader (RSC) ─────────────────────────────────────────────────────────────

interface Props {
  tenantId: string
  messages: Record<string, string>
}

export default async function AdminTenantSidebarLoader({ tenantId, messages }: Props) {
  let tenantNama  = ''
  let userNama    = ''
  let userJabatan = ''

  try {
    const payload = await verifyJWT()
    const db      = createServerSupabaseClient()

    const [tenantRes, memberRes] = await Promise.all([
      // Ambil nama tenant
      tenantId
        ? db.from('tenants').select('nama_brand').eq('id', tenantId).maybeSingle()
        : Promise.resolve({ data: null }),
      // Ambil nama + jabatan user dari user_memberships
      payload?.uid && tenantId
        ? db
            .from('user_memberships')
            .select('jabatan, user_profiles(nama)')
            .eq('user_id', payload.uid)
            .eq('tenant_id', tenantId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    tenantNama  = (tenantRes.data as { nama_brand?: string } | null)?.nama_brand ?? ''

    const memberData = memberRes.data as {
      jabatan?: string
      user_profiles?: { nama?: string } | null
    } | null

    userNama    = memberData?.user_profiles?.nama ?? payload?.displayName ?? ''
    userJabatan = memberData?.jabatan ?? 'AdminTenant'

  } catch { /* render dengan nilai kosong */ }

  return (
    <AdminTenantSidebarNav
      tenantNama={tenantNama}
      userNama={userNama}
      userJabatan={userJabatan}
      messages={messages}
    />
  )
}
