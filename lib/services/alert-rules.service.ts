// lib/services/alert-rules.service.ts
// Service: manajemen alert rules — auto-disable (M2)
// Dipakai oleh: metrics-collector.service.ts (sebelum health check)
//               app/api/superadmin/monitoring/alert-rules/route.ts
// Dibuat: Sesi #331 — FASE 1 Alert Monitoring
//
// M2: Sebelum health check, provider tanpa instance aktif → is_active=false otomatis.
// Nilai konfigurasi dari config_registry (ATURAN 8 — anti hardcode).

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getConfigValues }            from '@/lib/config-registry'

// ─── autoDisableRulesWithoutInstances (M2) ────────────────────────────────────

/**
 * Cek semua alert rules yang is_active=true.
 * Jika provider-nya tidak punya instance aktif (is_aktif=true di provider_instances),
 * set is_active=false + catat disabled_reason/at/by='SYSTEM'.
 *
 * Dipanggil dari metrics-collector.service sebelum batch health check.
 * Hanya berjalan jika config alert.auto_disable_check_enabled = 'true'.
 *
 * @returns Jumlah rules yang di-disable (0 jika semua sehat atau fitur dimatikan)
 */
export async function autoDisableRulesWithoutInstances(): Promise<number> {
  // Cek config: apakah fitur M2 aktif?
  const cfg = await getConfigValues('alert')
  if (cfg['auto_disable_check_enabled'] !== 'true') return 0

  const supabase = createServerSupabaseClient()

  // Ambil provider_id yang tidak punya instance aktif
  // dan masih punya rule aktif
  const { data: rulesWithoutActiveInstance, error } = await supabase
    .from('alert_rules')
    .select('id, provider_id')
    .eq('is_active', true)
    .not(
      'provider_id',
      'in',
      `(select distinct provider_id from provider_instances where is_aktif = true)`
    )

  if (error) throw new Error(`autoDisableRulesWithoutInstances query: ${error.message}`)
  if (!rulesWithoutActiveInstance || rulesWithoutActiveInstance.length === 0) return 0

  const ruleIds = rulesWithoutActiveInstance.map(r => r.id)
  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('alert_rules')
    .update({
      is_active:       false,
      disabled_reason: 'Provider tidak memiliki instance aktif saat ini',
      disabled_at:     now,
      disabled_by:     'SYSTEM',
      updated_at:      now,
    })
    .in('id', ruleIds)

  if (updateError) throw new Error(`autoDisableRulesWithoutInstances update: ${updateError.message}`)

  return ruleIds.length
}

// ─── softDisableRule ─────────────────────────────────────────────────────────

/**
 * Nonaktifkan satu alert rule secara manual (oleh SA via UI).
 * Soft-disable: is_active=false, bukan DELETE.
 *
 * @param ruleId    UUID alert rule yang akan dinonaktifkan
 * @param disabledBy UUID SA yang melakukan aksi
 * @param reason    Alasan nonaktif (wajib diisi dari UI)
 */
export async function softDisableRule(
  ruleId:     string,
  disabledBy: string,
  reason:     string
): Promise<void> {
  if (!reason?.trim()) throw new Error('Alasan nonaktif wajib diisi.')

  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('alert_rules')
    .update({
      is_active:       false,
      disabled_reason: reason.trim(),
      disabled_at:     now,
      disabled_by:     disabledBy,
      updated_at:      now,
    })
    .eq('id', ruleId)

  if (error) throw new Error(`softDisableRule: ${error.message}`)
}

// ─── enableRule ──────────────────────────────────────────────────────────────

/**
 * Aktifkan kembali rule yang sebelumnya di-disable.
 * Membersihkan disabled_reason/at/by.
 */
export async function enableRule(ruleId: string, enabledBy: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('alert_rules')
    .update({
      is_active:       true,
      disabled_reason: null,
      disabled_at:     null,
      disabled_by:     null,
      updated_at:      now,
      updated_by:      enabledBy,
    })
    .eq('id', ruleId)

  if (error) throw new Error(`enableRule: ${error.message}`)
}
