// lib/services/activity.service.ts
// Service layer untuk user presence + activity log — server-side.
// Panggil repository B-05 (user-presence) + B-06 (activity-log).
// Dibuat: Sesi #052 — BLOK C-03 TODO_ARSITEKTUR_LAYER_v1
//
// ARSITEKTUR:
//   Route Handler → ActivityService → UserPresenceRepository + ActivityLogRepository → DB
//   Ini MENGGANTIKAN lib/activity.ts (client-side) untuk server-side usage.
//   lib/activity.ts tetap ada sampai semua caller dimigrasikan (BLOK E-09).
//
// PERBEDAAN DENGAN lib/activity.ts:
//   - Server-side only (import 'server-only')
//   - Pakai repository (bukan direct Supabase client query)
//   - Pakai config_registry (bukan platform_policies) untuk activity_logging config
//   - Import constants (SESSION_STATUS) — bukan string literal

import 'server-only'
import {
  spUpsert as presenceUpsert,
  setOffline as presenceSetOffline,
} from '@/lib/repositories/user-presence.repository'
import {
  create as activityLogCreate,
  type ActivityLogData,
} from '@/lib/repositories/activity-log.repository'
import { getConfigValues, parseConfigBoolean } from '@/lib/config-registry'

// ─── Tipe untuk updateUserPresence ───────────────────────────────────────────

export interface UpdatePresenceParams {
  uid:              string
  tenantId:         string | null
  nama:             string
  role:             string
  device:           string
  currentPage:      string
  currentPageLabel: string
}

// ─── FUNGSI: updateUserPresence ──────────────────────────────────────────────
// Update posisi user — panggil SP via repository.
// SP sudah handle NULL tenant untuk SUPERADMIN.
/**
 * Update posisi user saat ini — panggil SP via repository.
 * Non-throwing: gagal tidak crash login flow.
 * @param params - UpdatePresenceParams berisi uid, tenantId, nama, role, device, currentPage
 */
export async function updateUserPresence(params: UpdatePresenceParams): Promise<void> {
  try {
    await presenceUpsert({
      uid:              params.uid,
      tenantId:         params.tenantId,
      nama:             params.nama,
      role:             params.role,
      device:           params.device,
      currentPage:      params.currentPage,
      currentPageLabel: params.currentPageLabel,
    })
  } catch (err) {
    console.error('[ActivityService] updateUserPresence gagal:', err)
    // Tidak throw — presence update bukan critical path
  }
}

// ─── FUNGSI: setUserOffline ──────────────────────────────────────────────────
// Set user offline — panggil repository.
/**
 * Set user offline — panggil repository.
 * Non-throwing: gagal tidak crash logout flow.
 * @param uid - UID user yang akan di-set offline
 * @param tenantId - Tenant ID, null untuk SUPERADMIN
 */
export async function setUserOffline(
  uid: string,
  tenantId: string | null
): Promise<void> {
  try {
    await presenceSetOffline({ uid, tenantId })
  } catch (err) {
    console.error('[ActivityService] setUserOffline gagal:', err)
  }
}

// ─── FUNGSI: writeActivityLog ────────────────────────────────────────────────
// Tulis activity log — cek policy dulu, lalu insert via repository.
// Policy activity_logging dibaca dari config_registry (bukan platform_policies).
/**
 * Cek policy activity_logging — jika diizinkan, insert log via repository.
 * Non-throwing: gagal tidak crash proses utama.
 * @param data - ActivityLogData berisi uid, role, action_type, module, page, dll
 */
export async function writeActivityLog(data: ActivityLogData): Promise<void> {
  try {
    // Cek policy apakah jenis aksi ini boleh dicatat
    const allowed = await isActionAllowed(data.action_type)
    if (!allowed) return

    await activityLogCreate(data)
  } catch (err) {
    console.error('[ActivityService] writeActivityLog gagal:', err)
    // Tidak throw — activity log bukan critical path
  }
}

// ─── PRIVATE: cek apakah action_type diizinkan oleh policy ───────────────────
async function isActionAllowed(
  actionType: ActivityLogData['action_type']
): Promise<boolean> {
  try {
    const cfg = await getConfigValues('activity_logging')

    // Default: page_view dan form_submit dicatat, button_click tidak
    const logPageViews    = parseConfigBoolean(cfg['log_page_views'], true)
    const logButtonClicks = parseConfigBoolean(cfg['log_button_clicks'], false)
    const logFormSubmits  = parseConfigBoolean(cfg['log_form_submits'], true)
    const logErrors       = parseConfigBoolean(cfg['log_errors'], true)

    if (actionType === 'PAGE_VIEW'    && !logPageViews)    return false
    if (actionType === 'BUTTON_CLICK' && !logButtonClicks) return false
    if (actionType === 'FORM_SUBMIT'  && !logFormSubmits)  return false
    if (actionType === 'FORM_ERROR'   && !logErrors)       return false

    return true
  } catch {
    // Config gagal dibaca — default: catat semua
    return true
  }
}

// ─── Re-export tipe dari repository untuk kemudahan caller ───────────────────
export type { ActivityLogData }
