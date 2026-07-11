// lib/repositories/alert-rules.repository.ts
// Repository untuk tabel alert_rules
// Dipakai oleh: alert.service.ts, monitoring.service.ts
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
// PERUBAHAN Sesi #342 — M8 Audit Trail:
//   - updateAlertRule() → catat RULE_UPDATE ke monitoring_audit_log setelah update berhasil
// PERUBAHAN Sesi #343 — M9 Guardrail:
//   - updateAlertRule() → bedakan RULE_DISABLE / RULE_ENABLE / RULE_UPDATE di audit trail
//   - tambah bulkDisableStaleRules() — soft-disable rules milik provider tidak aktif

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
 * Ambil semua rules aktif untuk satu provider.
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
 *
 * M8: catat audit trail setelah update berhasil (fire-and-forget).
 * M9: bedakan action audit berdasarkan payload:
 *   - hanya is_active=false  → RULE_DISABLE
 *   - hanya is_active=true   → RULE_ENABLE
 *   - field lain (± is_active) → RULE_UPDATE
 */
export async function updateAlertRule(
  id:        string,
  payload:   UpdateAlertRulePayload,
  updatedBy: string
): Promise<AlertRule> {
  const supabase = createServerSupabaseClient()

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

  // M9: tentukan action audit yang tepat
  try {
    const fieldsChanged  = Object.keys(payload) as Array<keyof UpdateAlertRulePayload>
    const onlyIsActive   = fieldsChanged.length === 1 && fieldsChanged[0] === 'is_active'
    const auditAction    = onlyIsActive
      ? (payload.is_active === false ? 'RULE_DISABLE' : 'RULE_ENABLE')
      : 'RULE_UPDATE'

    const beforeSnap = before
      ? Object.fromEntries(fieldsChanged.map(k => [k, (before  as unknown as Record<string, unknown>)[k]]))
      : null
    const afterSnap  = Object.fromEntries(fieldsChanged.map(k => [k, (updated as unknown as Record<string, unknown>)[k]]))

    await writeMonitoringAudit({
      actor:       updatedBy,
      actor_label: `SA:${updatedBy}`,
      action:      auditAction,
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
    console.error('[alert-rules.repository] audit gagal:', auditErr)
  }

  return updated
}

// ─── bulkDisableStaleRules (M9) ───────────────────────────────────────────────

/**
 * Soft-disable semua alert rules yang is_active=true tapi provider-nya
 * sudah tidak aktif (is_active=false di service_providers).
 *
 * Definisi "usang": rule aktif yang provider-nya nonaktif.
 * Soft-disable: set is_active=false + disabled_reason.
 * Catat RULE_DISABLE di audit per rule (fire-and-forget).
 *
 * @param disabledBy  UUID SA yang memicu aksi ini
 * @returns           Jumlah rule yang dinonaktifkan
 */
export async function bulkDisableStaleRules(disabledBy: string): Promise<number> {
  const supabase = createServerSupabaseClient()

  // Ambil rules aktif yang provider-nya tidak aktif
  const { data: staleRules, error: fetchErr } = await supabase
    .from('alert_rules')
    .select('id, provider_id, alert_type, service_providers!inner(is_active)')
    .eq('is_active', true)
    .eq('service_providers.is_active', false)

  if (fetchErr) throw new Error(`bulkDisableStaleRules fetch: ${fetchErr.message}`)
  if (!staleRules || staleRules.length === 0) return 0

  const staleIds    = staleRules.map(r => r.id as string)
  const now         = new Date().toISOString()
  const reasonText  = 'Provider tidak aktif — dinonaktifkan oleh SA via Bersihkan Aturan Usang'

  const { error: updateErr } = await supabase
    .from('alert_rules')
    .update({
      is_active:       false,
      disabled_reason: reasonText,
      disabled_at:     now,
      disabled_by:     disabledBy,
      updated_at:      now,
      updated_by:      disabledBy,
    })
    .in('id', staleIds)

  if (updateErr) throw new Error(`bulkDisableStaleRules update: ${updateErr.message}`)

  // Audit setiap rule — fire-and-forget, tidak gagalkan aksi utama
  for (const rule of staleRules) {
    try {
      await writeMonitoringAudit({
        actor:       disabledBy,
        actor_label: `SA:${disabledBy}`,
        action:      'RULE_DISABLE',
        entity_type: 'alert_rules',
        entity_id:   rule.id as string,
        detail_json: {
          provider_id:     rule.provider_id,
          alert_type:      rule.alert_type,
          disabled_reason: reasonText,
          source:          'bulk_disable_stale',
        },
      })
    } catch (auditErr) {
      console.error('[alert-rules.repository] audit RULE_DISABLE bulk gagal:', auditErr)
    }
  }

  return staleIds.length
}

// ─── upsertDefaultRules ───────────────────────────────────────────────────────

/**
 * Buat default alert rules untuk semua provider jika belum ada.
 * Dipanggil dari collect-metrics cron saat pertama kali jalan.
 * Nilai threshold dari config_registry monitoring.* keys.
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
      onConflict:       'provider_id,alert_type',
      ignoreDuplicates: true,
    })

  if (error) throw new Error(`upsertDefaultRules: ${error.message}`)
}
