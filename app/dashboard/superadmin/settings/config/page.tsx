// app/dashboard/superadmin/settings/config/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ConfigPageClient }           from './ConfigPageClient'

export default async function LoginSettingsPage() {
  const db = createServerSupabaseClient()

  const { data } = await db
    .from('config_registry')
    .select('*')
    .eq('feature_key', 'security_login')
    .eq('is_active', true)
    .order('label', { ascending: true })

  // Transformasi row database → format ConfigGroup yang diharapkan ConfigPageClient
  type DBRow = {
    id: string; label: string; kategori: string; feature_key: string
    nilai: string; tipe_data: string; nilai_enum: string[] | null
    akses_ubah: string[]; is_active: boolean
  }

  const groupMap = new Map<string, {
    title: string; feature_key: string
    items: {
      id: string; label: string; type: 'toggle' | 'number-unit' | 'select-only'
      value: number | boolean | string; options?: string[]
      adminCanChange: boolean; enabled: boolean
    }[]
  }>()

  for (const row of ((data ?? []) as DBRow[])) {
    const kat = row.kategori

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: row.feature_key, items: [] })
    }

    // Map tipe_data → type UI
    let type: 'toggle' | 'number-unit' | 'select-only' = 'number-unit'
    if (row.tipe_data === 'boolean') type = 'toggle'
    else if (row.tipe_data === 'select') type = 'select-only'
    else type = 'number-unit'

    // Parse nilai sesuai tipe
    let value: number | boolean | string = row.nilai
    if (type === 'toggle') value = row.nilai === 'true'
    else if (type === 'number-unit') value = Number(row.nilai) || 0

    groupMap.get(kat)!.items.push({
      id:            row.id,
      label:         row.label,
      type,
      value,
      options:       row.nilai_enum ?? undefined,
      adminCanChange: row.akses_ubah?.includes('admin') ?? false,
      enabled:       row.is_active,
    })
  }

  const groups = Array.from(groupMap.values())

  return <ConfigPageClient initialData={groups} />
}