// lib/activity.ts
// ⚠️ DEPRECATED Sesi #052 — Digantikan oleh:
//   Server-side: lib/services/activity.service.ts (ActivityService)
//   File ini MASIH dipakai oleh client components (useLoginFlow.ts).
//   JANGAN import file ini dari server-side code — gunakan ActivityService.
//   File ini akan dihapus setelah semua client caller dimigrasikan.
// Mencatat posisi user secara realtime (User Presence) dan aksi penting ke activity log
// Dipakai di SEMUA halaman setiap kali user navigasi atau lakukan aksi
//
// PERUBAHAN dari versi sebelumnya:
//   - Hapus import createServerSupabaseClient — diganti createBrowserSupabaseClient
//   - Hapus import getEffectivePolicy dari lib/policy (server-only)
//   - Policy activity_logging dibaca langsung via browser client
//   - File ini sekarang bisa dipakai di Client Component maupun server
//
// PERUBAHAN Sesi #039:
//   - updateUserPresence: tenantId bertipe string | null
//     SUPERADMIN kirim null bukan '' (empty string bukan UUID valid → Supabase 400)
//   - SUPERADMIN: tidak pakai upsert (PostgREST tidak support partial unique index)
//     Diganti dengan SELECT → UPDATE jika ada, INSERT jika belum ada
//   - Non-SUPERADMIN: tetap upsert dengan onConflict 'tenant_id,uid'

import { createBrowserSupabaseClient } from '@/lib/supabase-client'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface PageInfo {
  page:   string
  label:  string
  module: string
}

export interface ActivityLogData {
  uid:           string
  nama:          string
  tenant_id:     string
  session_id:    string
  role:          string
  action_type:   'PAGE_VIEW' | 'BUTTON_CLICK' | 'FORM_SUBMIT' | 'FORM_ERROR' | 'API_CALL'
  module:        'AUTH' | 'ORDER' | 'PAYMENT' | 'VENDOR' | 'ADMIN' | 'DISPUTE' | 'CHAT'
  page:          string
  page_label:    string
  action_detail: string
  result:        'SUCCESS' | 'FAILED' | 'BLOCKED'
  device:        string
  gps_kota:      string
  ip_address?:   string
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

export async function updateUserPresence(
  uid:       string,
  tenantId:  string | null,  // null untuk SUPERADMIN — tidak punya tenant_id
  sessionId: string,
  nama:      string,
  role:      string,
  device:    string,
  gpsKota:   string,
  pageInfo:  PageInfo
): Promise<void> {
  const supabase   = createBrowserSupabaseClient()
  const tenantNull = tenantId || null  // '' → null untuk SUPERADMIN

  const payload = {
    uid,
    tenant_id:          tenantNull,
    nama,
    role,
    device,
    current_page:       pageInfo.page,
    current_page_label: pageInfo.label,
    last_active:        new Date().toISOString(),
    status:             'online',
  }

  if (tenantNull) {
    // Non-SUPERADMIN: upsert berdasarkan composite key tenant_id + uid
    await supabase
      .from('user_presence')
      .upsert(payload, { onConflict: 'tenant_id,uid' })
  } else {
    // SUPERADMIN: PostgREST tidak support partial unique index untuk upsert
    // Ganti dengan: cek apakah sudah ada → update jika ada, insert jika belum
    const { data: existing } = await supabase
      .from('user_presence')
      .select('uid')
      .eq('uid', uid)
      .is('tenant_id', null)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('user_presence')
        .update(payload)
        .eq('uid', uid)
        .is('tenant_id', null)
    } else {
      await supabase
        .from('user_presence')
        .insert(payload)
    }
  }
}

export async function writeActivityLog(
  tenantId: string,
  data:     ActivityLogData
): Promise<void> {
  const supabase = createBrowserSupabaseClient()

  // Baca policy activity_logging langsung via browser client
  let logPageViews    = true
  let logButtonClicks = false
  let logFormSubmits  = true
  let logErrors       = true

  try {
    const { data: pol } = await supabase
      .from('platform_policies')
      .select('nilai')
      .eq('feature_key', 'activity_logging')
      .single()

    if (pol?.nilai) {
      const p = pol.nilai as Record<string, unknown>
      if (typeof p['log_page_views']    === 'boolean') logPageViews    = p['log_page_views']
      if (typeof p['log_button_clicks'] === 'boolean') logButtonClicks = p['log_button_clicks']
      if (typeof p['log_form_submits']  === 'boolean') logFormSubmits  = p['log_form_submits']
      if (typeof p['log_errors']        === 'boolean') logErrors       = p['log_errors']
    }
  } catch { /* pakai nilai default di atas */ }

  // Cek apakah jenis aksi ini diizinkan policy
  if (data.action_type === 'PAGE_VIEW'    && !logPageViews)    return
  if (data.action_type === 'BUTTON_CLICK' && !logButtonClicks) return
  if (data.action_type === 'FORM_SUBMIT'  && !logFormSubmits)  return
  if (data.action_type === 'FORM_ERROR'   && !logErrors)       return

  await supabase
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
}

export async function setUserOffline(
  uid:      string,
  tenantId: string | null  // null untuk SUPERADMIN
): Promise<void> {
  const supabase = createBrowserSupabaseClient()

  const query = supabase
    .from('user_presence')
    .update({
      status:      'offline',
      last_active: new Date().toISOString(),
    })
    .eq('uid', uid)

  if (tenantId) {
    await query.eq('tenant_id', tenantId)
  } else {
    await query.is('tenant_id', null)
  }
}
