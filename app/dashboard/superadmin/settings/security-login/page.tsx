// app/dashboard/superadmin/settings/config/page.tsx
// force-dynamic: halaman ini fetch data dari Supabase — tidak boleh di-prerender saat build
export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ConfigPageClient }           from './ConfigPageClient'

// Mapping tipe_data DB → type yang diharapkan ConfigPageClient
function mapTipe(tipe_data: string): 'toggle' | 'number-unit' | 'select-only' {
  if (tipe_data === 'boolean') return 'toggle'
  if (tipe_data === 'select')  return 'select-only'
  return 'number-unit'
}

// Mapping nilai DB (selalu string) → tipe yang benar sesuai tipe_data
function mapValue(nilai: string, tipe_data: string): number | boolean | string {
  if (tipe_data === 'boolean') return nilai === 'true'
  if (tipe_data === 'number')  return Number(nilai)
  return nilai
}

export default async function LoginSettingsPage() {
  const db = createServerSupabaseClient()

  const { data } = await db
    .from('config_registry')
    .select('*')
    .eq('feature_key', 'security_login')
    .is('tenant_id', null)
    .eq('is_active', true)
    .order('label', { ascending: true })

  // Kelompokkan per kategori dan map ke format ConfigGroup[] yang diharapkan ConfigPageClient
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       {
      id:             string
      label:          string
      type:           'toggle' | 'number-unit' | 'select-only'
      value:          number | boolean | string
      unit?:          string
      units?:         string[]
      options?:       string[]
      option_group_id?: string | null
      adminCanChange: boolean
      enabled:        boolean
    }[]
  }>()

  for (const item of data ?? []) {
    const kat = item.kategori as string
    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: kat, items: [] })
    }
    const group = groupMap.get(kat)!
    group.items.push({
      id:             item.id             as string,
      label:          item.label          as string,
      type:           mapTipe(item.tipe_data as string),
      value:          mapValue(item.nilai as string, item.tipe_data as string),
      options:        (item.nilai_enum as string[] | null) ?? undefined,
      option_group_id: null,
      adminCanChange: ((item.akses_ubah as string[]) ?? []).includes('admin'),
      enabled:        item.is_active      as boolean,
    })
  }

  const initialData = Array.from(groupMap.values())

  return <ConfigPageClient initialData={initialData} />
}
