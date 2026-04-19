// app/dashboard/superadmin/settings/config/page.tsx
// force-dynamic: halaman ini fetch data dari Supabase — tidak boleh di-prerender saat build
export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ConfigPageClient }           from './ConfigPageClient'

export default async function LoginSettingsPage() {
  const db = createServerSupabaseClient()

  const { data } = await db
    .from('config_registry')
    .select('*')
    .eq('feature_key', 'security_login')
    .is('tenant_id', null)
    .eq('is_active', true)
    .order('label', { ascending: true })

  const groups = (() => {
    const map = new Map<string, { group_id: string; group_label: string; items: NonNullable<typeof data> }>()
    for (const item of data ?? []) {
      const kat = item.kategori as string
      if (!map.has(kat)) {
        map.set(kat, { group_id: kat, group_label: kat, items: [] })
      }
      const group = map.get(kat)
      if (group) group.items.push(item)
    }
    return Array.from(map.values())
  })()

  return <ConfigPageClient groups={groups} />
}
