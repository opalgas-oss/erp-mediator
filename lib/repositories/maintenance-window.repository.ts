// lib/repositories/maintenance-window.repository.ts
// Repository: query tabel maintenance_windows
// Dipakai oleh: alert.service.ts (cek window aktif sebelum enqueue notifikasi)
// Dibuat: Sesi #336 — M4 Maintenance Window

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── findActiveWindow ─────────────────────────────────────────────────────────
// Cek apakah ada maintenance window yang sedang aktif saat ini.
// Window aktif = is_active=true DAN starts_at <= NOW() <= ends_at
// scope GLOBAL atau scope SPECIFIC dengan provider_id yang cocok.
// Return: window pertama yang cocok, atau null jika tidak ada.

export async function findActiveWindow(
  providerId: string
): Promise<{ id: string; name: string; scope: string } | null> {
  const supabase = await createServerSupabaseClient()

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('maintenance_windows')
    .select('id, name, scope')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .or(`scope.eq.GLOBAL,and(scope.eq.SPECIFIC,provider_id.eq.${providerId})`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[maintenance-window.repository] findActiveWindow error:', error.message)
    return null
  }

  return data ?? null
}
