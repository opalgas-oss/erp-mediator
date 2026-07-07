// lib/services/alert-lifecycle.service.ts
// Service: siklus hidup insiden alert (M1) + state machine (A3) + auto-resolve (A2)
// Dipakai oleh: app/api/superadmin/monitoring/alerts/[id]/route.ts
//               alert.service.ts (untuk auto-resolve saat UP)
// Dibuat: Sesi #331 — FASE 1 Alert Monitoring
//
// State machine valid (A3): lihat VALID_ALERT_TRANSITIONS di monitoring.types.ts
// Semua transisi yang tidak terdaftar → ditolak dengan error

import 'server-only'
import {
  findAlertLogById,
  updateAlertLogStatus,
  findOpenAlertByDedupKey,
} from '@/lib/repositories/alert-log.repository'
import type {
  AlertStatus,
  AcknowledgeAlertPayload,
  ResolveAlertPayload,
} from '@/lib/types/monitoring.types'
import { VALID_ALERT_TRANSITIONS } from '@/lib/types/monitoring.types'

// ─── validateAlertTransition (A3) ────────────────────────────────────────────

/**
 * Validasi apakah transisi status dari → to diizinkan oleh state machine.
 * Lihat VALID_ALERT_TRANSITIONS di monitoring.types.ts untuk daftar lengkap.
 * Throw Error jika transisi tidak valid — caller wajib catch.
 */
export function validateAlertTransition(from: AlertStatus, to: AlertStatus): void {
  const allowed = VALID_ALERT_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new Error(
      `Transisi status tidak valid: ${from} → ${to}. ` +
      `Transisi yang diizinkan dari ${from}: ${allowed.join(', ') || 'tidak ada'}.`
    )
  }
}

// ─── acknowledgeAlert (M1) ────────────────────────────────────────────────────

/**
 * SA menandai insiden "sedang ditangani".
 * Transisi: TRIGGERED → ACKNOWLEDGED.
 */
export async function acknowledgeAlert(payload: AcknowledgeAlertPayload): Promise<void> {
  const { alertLogId, acknowledgedBy } = payload

  const log = await findAlertLogById(alertLogId)
  if (!log) throw new Error(`Alert log tidak ditemukan: ${alertLogId}`)

  validateAlertTransition(log.status, 'ACKNOWLEDGED')

  await updateAlertLogStatus(alertLogId, {
    status:          'ACKNOWLEDGED',
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: acknowledgedBy,
    updated_at:      new Date().toISOString(),
  })
}

// ─── resolveAlert (M1) ───────────────────────────────────────────────────────

/**
 * SA menandai insiden "selesai ditangani" dengan catatan penyelesaian.
 * Transisi: ACKNOWLEDGED → RESOLVED.
 */
export async function resolveAlert(payload: ResolveAlertPayload): Promise<void> {
  const { alertLogId, resolvedBy, resolutionNote } = payload

  if (!resolutionNote?.trim()) {
    throw new Error('Catatan penyelesaian wajib diisi saat resolve insiden.')
  }

  const log = await findAlertLogById(alertLogId)
  if (!log) throw new Error(`Alert log tidak ditemukan: ${alertLogId}`)

  validateAlertTransition(log.status, 'RESOLVED')

  await updateAlertLogStatus(alertLogId, {
    status:          'RESOLVED',
    resolved_at:     new Date().toISOString(),
    resolved_by:     resolvedBy,
    resolution_note: resolutionNote.trim(),
    updated_at:      new Date().toISOString(),
  })
}

// ─── reopenAlert (M1) ────────────────────────────────────────────────────────

/**
 * SA membuka kembali insiden yang sudah RESOLVED.
 * Transisi: RESOLVED → TRIGGERED.
 */
export async function reopenAlert(alertLogId: string): Promise<void> {
  const log = await findAlertLogById(alertLogId)
  if (!log) throw new Error(`Alert log tidak ditemukan: ${alertLogId}`)

  validateAlertTransition(log.status, 'TRIGGERED')

  await updateAlertLogStatus(alertLogId, {
    status:     'TRIGGERED',
    updated_at: new Date().toISOString(),
  })
}

// ─── autoResolveAlert (A2) ───────────────────────────────────────────────────

/**
 * Dipanggil dari alert.service saat health check UP kembali.
 * Cari insiden terbuka (TRIGGERED/ACKNOWLEDGED) dengan dedup_key yang sama,
 * lalu set AUTO_RESOLVED + catat durasi downtime.
 *
 * @param dedupKey  Format: `{provider_id}:{alert_type}:TRIGGERED`
 * @returns         true jika ada insiden yang di-auto-resolve, false jika tidak ada
 */
export async function autoResolveAlert(dedupKey: string): Promise<boolean> {
  const openLog = await findOpenAlertByDedupKey(dedupKey)
  if (!openLog) return false

  // Validasi transisi (dari TRIGGERED atau ACKNOWLEDGED ke AUTO_RESOLVED)
  validateAlertTransition(openLog.status, 'AUTO_RESOLVED')

  const now = new Date()
  const triggeredAt = new Date(openLog.triggered_at)
  const downtimeSeconds = Math.round((now.getTime() - triggeredAt.getTime()) / 1000)

  await updateAlertLogStatus(openLog.id, {
    status:                    'AUTO_RESOLVED',
    auto_resolved_at:          now.toISOString(),
    downtime_duration_seconds: downtimeSeconds,
    updated_at:                now.toISOString(),
  })

  return true
}
