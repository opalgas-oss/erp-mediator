// app/dashboard/superadmin/layout.tsx
export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { DashboardShell }             from '@/components/DashboardShell'

async function getSidebarData(): Promise<{
  brandName:   string
  messages:    Record<string, string>
  featureKeys: string[]
}> {
  try {
    const db = createServerSupabaseClient()

    const { data: tenant } = await db
      .from('tenants')
      .select('nama_brand')
      .limit(1)
      .single()

    // Fetch sidebar_ui + page_ui sekaligus — satu round-trip
    const messages = await getMessagesByKategori(['sidebar_ui', 'page_ui'])

    const { data: configRows } = await db
      .from('config_registry')
      .select('feature_key')
      .is('tenant_id', null)
      .eq('is_active', true)

    const featureKeys = [...new Set((configRows ?? []).map((r: { feature_key: string }) => r.feature_key))]

    return {
      brandName:   tenant?.nama_brand ?? 'ERP Mediator',
      messages:    messages ?? {},
      featureKeys: featureKeys.length > 0 ? featureKeys : ['security_login'],
    }
  } catch {
    return {
      brandName:   'ERP Mediator',
      messages:    {},
      featureKeys: ['security_login'],
    }
  }
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'SUPERADMIN') redirect('/login')

  const { brandName, messages, featureKeys } = await getSidebarData()

  return (
    <DashboardShell brandName={brandName} messages={messages} featureKeys={featureKeys}>
      {children}
    </DashboardShell>
  )
}
