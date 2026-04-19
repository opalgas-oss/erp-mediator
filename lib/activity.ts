// lib/activity.ts
// Mencatat posisi user secara realtime (User Presence) dan aksi penting ke activity log
// Dipakai di SEMUA halaman setiap kali user navigasi atau lakukan aksi
//
// PERUBAHAN dari versi sebelumnya:
//   - Hapus import createServerSupabaseClient — diganti createBrowserSupabaseClient
//   - Hapus import getEffectivePolicy dari lib/policy (server-only)
//   - Policy activity_logging dibaca langsung via browser client
//   - File ini sekarang bisa dipakai di Client Component maupun server

import { createBrowserSupabaseClient } from '@/lib/supabase-client'

// ============================================================
// TYPE DEFINITIONS — TIDAK BERUBAH
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
  tenantId:  string,
  sessionId: string,
  nama:      string,
  role:      string,
  device:    string,
  gpsKota:   string,
  pageInfo:  PageInfo
): Promise<void> {
  const supabase = createBrowserSupabaseClient()

  await supabase
    .from('user_presence')
    .upsert(
      {
        uid,
        tenant_id:          tenantId,
        nama,
        role,
        device,
        current_page:       pageInfo.page,
        current_page_label: pageInfo.label,
        last_active:        new Date().toISOString(),
        status:             'online',
      },
      { onConflict: 'tenant_id,uid' }
    )
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
  tenantId: string
): Promise<void> {
  const supabase = createBrowserSupabaseClient()

  await supabase
    .from('user_presence')
    .update({
      status:      'offline',
      last_active: new Date().toISOString(),
    })
    .eq('uid', uid)
    .eq('tenant_id', tenantId)
}