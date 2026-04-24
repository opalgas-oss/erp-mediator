// lib/repositories/activity-log.repository.ts
// Repository untuk tabel activity_logs — insert log aktivitas.
// Dibuat: Sesi #051 — BLOK B-06 TODO_ARSITEKTUR_LAYER_v1

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe Data ──────────────────────────────────────────────────────────────

export interface ActivityLogData {
  uid:           string
  tenant_id:     string
  nama:          string
  role:          string
  session_id:    string
  action_type:   'PAGE_VIEW' | 'BUTTON_CLICK' | 'FORM_SUBMIT' | 'FORM_ERROR' | 'API_CALL'
  module:        string
  page:          string
  page_label?:   string
  action_detail: string
  result:        'SUCCESS' | 'FAILED' | 'BLOCKED'
  device:        string
  gps_kota:      string
  ip_address?:   string
}

// ─── Repository ─────────────────────────────────────────────────────────────

/**
 * Insert satu record aktivitas ke tabel activity_logs.
 * @param data - ActivityLogData berisi uid, role, action_type, module, page, dll
 * @throws Error jika insert DB gagal
 */
export async function create(data: ActivityLogData): Promise<void> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('activity_logs')
    .insert({
      uid:           data.uid,
      tenant_id:     data.tenant_id,
      nama:          data.nama,
      role:          data.role,
      action_type:   data.action_type,
      module:        data.module,
      page:          data.page,
      action_detail: data.action_detail,
      result:        data.result,
      device:        data.device,
      ip_address:    data.ip_address ?? null,
      gps_kota:      data.gps_kota,
      timestamp:     new Date().toISOString(),
    })

  if (error) throw new Error(`[activity-log.repository] create: ${error.message}`)
}
