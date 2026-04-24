// lib/repositories/user-presence.repository.ts
// Repository untuk tabel user_presence — akses DB via SP.
// Dibuat: Sesi #051 — BLOK B-05 TODO_ARSITEKTUR_LAYER_v1

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SESSION_STATUS } from '@/lib/constants'

// ─── Tipe Data ──────────────────────────────────────────────────────────────

export interface UpsertPresenceParams {
  uid:              string
  tenantId:         string | null
  nama?:            string
  role?:            string
  device?:          string
  currentPage?:     string
  currentPageLabel?: string
}

export interface UpsertPresenceResult {
  success: boolean
  action:  'INSERT' | 'UPDATE' | 'UPSERT'
}

// ─── Repository ─────────────────────────────────────────────────────────────

/**
 * Panggil SP sp_upsert_user_presence — insert atau update posisi user saat ini.
 * SP handle NULL tenant untuk SUPERADMIN secara otomatis.
 * @param params - uid, tenantId (null untuk SUPERADMIN), nama, role, device, currentPage, currentPageLabel
 * @returns UpsertPresenceResult berisi success dan action ('INSERT'|'UPDATE'|'UPSERT')
 * @throws Error jika SP gagal dieksekusi
 */
export async function spUpsert(params: UpsertPresenceParams): Promise<UpsertPresenceResult> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.rpc('sp_upsert_user_presence', {
    p_uid:                params.uid,
    p_tenant_id:          params.tenantId ?? null,
    p_nama:               params.nama ?? null,
    p_role:               params.role ?? null,
    p_device:             params.device ?? null,
    p_current_page:       params.currentPage ?? null,
    p_current_page_label: params.currentPageLabel ?? null,
  })

  if (error) throw new Error(`[user-presence.repository] spUpsert: ${error.message}`)
  return data as UpsertPresenceResult
}

/**
 * Set status user menjadi OFFLINE di tabel user_presence.
 * Tenant-aware: SUPERADMIN (null) pakai IS NULL, tenant pakai eq.
 * @param params - uid dan tenantId (null untuk SUPERADMIN)
 * @throws Error jika update DB gagal
 */
export async function setOffline(params: {
  uid:      string
  tenantId: string | null
}): Promise<void> {
  const db = createServerSupabaseClient()

  let query = db
    .from('user_presence')
    .update({
      status:      SESSION_STATUS.OFFLINE,
      last_active: new Date().toISOString(),
    })
    .eq('uid', params.uid)

  if (params.tenantId) {
    query = query.eq('tenant_id', params.tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  const { error } = await query
  if (error) throw new Error(`[user-presence.repository] setOffline: ${error.message}`)
}
