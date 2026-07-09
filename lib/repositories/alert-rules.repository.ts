// lib/repositories/alert-rules.repository.ts
// Repository untuk tabel alert_rules
// Dipakai oleh: alert.service.ts, monitoring.service.ts
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
// PERUBAHAN Sesi #342 — M8 Audit Trail:
//   - updateAlertRule() → catat RULE_UPDATE ke monitoring_audit_log setelah update berhasil

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { writeMonitoringAudit }       from '@/lib/repositories/monitoring-audit-log.repository'
import type {
  AlertRule,
  AlertRuleWithProvider,
  UpdateAlertRulePayload,
} from '@/lib/types/monitoring.types'

// ─── findAll ──────────────────────────────────────────────────────────────────

/**
 * Ambil semua alert rules dengan nama provider — JOIN service_providers (M5 S#340).
 * Dipakai oleh: getAlertRules di monitoring.service, AlertRulesPanel UI.
 */
export async function findAllAlertRules(): Promise<AlertRuleWithProvider[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*, service_providers(nama, kode, kategori)')
    .order('provider_id')
    .order('alert_type')

  if (error) throw new Error(`findAllAlertRules: ${error.message}`)

  // Flatten hasil JOIN: service_providers { nama, kode, kategori } → field flat
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as AlertRule & {
      service_providers: { nama: string; kode: string; kategori: string } | null
    }
    return {
      ...r,
      provider_nama:     r.service_providers?.nama     ?? '',
      provider_kode:     r.service_providers?.kode     ?? '',
      provider_kategori: r.service_providers?.kategori ?? '',
      service_providers: undefined,
    } as AlertRuleWithProvider
  })
}

// ─── findByProvider ───────────────────────────────────────────────────────────

/**
 * Ambil semua rules untuk satu provider tertentu.
 * Dipakai oleh alert.service saat threshold check.
 */
export async function findRulesByProvider(providerId: string): Promise<AlertRule[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true)

  if (error) throw new Error(`findRulesByProvider: ${error.message}`)
  return (data ?? []) as AlertRule[]
}

// ─── findById ─────────────────────────────────────────────────────────────────

export async function findAlertRuleById(id: string): Promise<AlertRule | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`findAlertRuleById: ${error.message}`)
  }
  return data as AlertRule
}

// ─── updateRule ───────────────────────────────────────────────────────────────

/**
 * Update threshold/cooldown/channel/status satu alert rule.
 * Hanya SuperAdmin yang boleh — RLS sudah guard di DB level.
 * M8: catat RULE_UPDATE ke monitoring_audit_log setelah update berhasil (fire-and-forget).
 */
export async function updateAlertRule(
  id:        string,
  payload:   UpdateAlertRulePayload,
  updatedBy: string
): Promise<AlertRule> {
  const supabase = createServerSupabaseClient()

  // Ambil data sebelum update untuk detail audit (before state)
  const before = await findAlertRuleById(id)

  const { data, error } = await supabase
    .from('alert_rules')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateAlertRule: ${error.message}`)

  const updated = data as AlertRule

  // M8: audit trail — fire-and-forget, tidak gagalkan aksi utama
  try {
    const fieldsChanged = Object.keys(payload) as Array<keyof UpdateAlertRulePayload>
    // Double cast via unknown diperlukan karena AlertRule bukan index signature type
    const beforeSnap = before
      ? Object.fromEntries(fieldsChanged.map(k => [k, (before  as unknown as Record<string, unknown>)[k]]))
      : null
    const afterSnap  = Object.fromEntries(fieldsChanged.map(k => [k, (updated as unknown as Record<string, unknown>)[k]]))

    await writeMonitoringAudit({
      actor:       updatedBy,
      actor_label: `SA:${updatedBy}`,
      action:      'RULE_UPDATE',
      entity_type: 'alert_rules',
      entity_id:   id,
      detail_json: {
        provider_id:    updated.provider_id,
        alert_type:     updated.alert_type,
        fields_changed: fieldsChanged,
        before:         beforeSnap,
        after:          afterSnap,
      },
    })
  } catch (auditErr) {
    console.error('[alert-rules.repository] audit RULE_UPDATE gagal:', auditErr)
  }

  return updated
}

// ─── upsertDefaultRules ───────────────────────────────────────────────────────

/**
 * Buat default alert rules untuk semua provider jika belum ada.
 * Dipanggil dari collect-metrics cron saat pertama kali jalan.
 * Nilai threshold dari config_registry monitoring.* keys.
 *
 * @param providerIds Daftar UUID semua provider aktif
 * @param thresholdMs Dari config monitoring.alert_threshold_response_ms
 * @param cooldown    Dari config monitoring.alert_cooldown_minutes
 * @param consecutive Dari config monitoring.alert_consecutive_failures
 */
export async function upsertDefaultRules(
  providerIds: string[],
  thresholdMs: number,
  cooldown:    number,
  consecutive: number
): Promise<void> {
  const supabase = createServerSupabaseClient()

  const rows = providerIds.flatMap(pid => [
    {
      provider_id:          pid,
      alert_type:           'DOWN' as const,
      threshold_value:      1,
      consecutive_failures: consecutive,
      cooldown_minutes:     cooldown,
      notif_channels:       ['WA', 'EMAIL'],
      is_active:            true,
    },
    {
      provider_id:          pid,
      alert_type:           'SLOW' as const,
      threshold_value:      thresholdMs,
      consecutive_failures: consecutive,
      cooldown_minutes:     cooldown,
      notif_channels:       ['WA', 'EMAIL'],
      is_active:            true,
    },
  ])

  const { error } = await supabase
    .from('alert_rules')
    .upsert(rows, {
      onConflict:        'provider_id,alert_type',
      ignoreDuplicates:  true,  // tidak overwrite yang sudah diubah manual SuperAdmin
    })

  if (error) throw new Error(`upsertDefaultRules: ${error.message}`)
}
