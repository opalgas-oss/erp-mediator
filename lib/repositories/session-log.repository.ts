// lib/repositories/session-log.repository.ts
// Repository untuk tabel session_logs — akses DB langsung.
// Dibuat: Sesi #051 — BLOK B-02 TODO_ARSITEKTUR_LAYER_v1

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe Data ──────────────────────────────────────────────────────────────

export interface SessionLogRow {
  id:         string
  session_id: string
  uid:        string
  tenant_id:  string | null
  role:       string
  device:     string | null
  ip_address: string | null
  gps_kota:   string | null
  login_at:   string | null
  logout_at:  string | null
}

export interface CreateSessionParams {
  uid:       string
  tenantId:  string | null
  role:      string
  device:    string
  gpsKota:   string
  sessionId: string
}

// ─── Repository ─────────────────────────────────────────────────────────────

/**
 * Buat record session_logs baru saat user login berhasil.
 * @param params - uid, tenantId (null untuk SUPERADMIN), role, device, gpsKota, sessionId
 * @returns sessionId yang sudah diinsert
 * @throws Error jika insert DB gagal
 */
export async function create(params: CreateSessionParams): Promise<string> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('session_logs')
    .insert({
      id:         params.sessionId,
      session_id: params.sessionId,
      uid:        params.uid,
      tenant_id:  params.tenantId || null,
      role:       params.role,
      device:     params.device,
      gps_kota:   params.gpsKota,
      login_at:   new Date().toISOString(),
      logout_at:  null,
    })

  if (error) throw new Error(`[session-log.repository] create: ${error.message}`)
  return params.sessionId
}

/**
 * Tandai semua sesi aktif user sebagai logout (set logout_at = sekarang).
 * @param uid - UID user yang logout
 * @throws Error jika update DB gagal
 */
export async function markLogout(uid: string): Promise<void> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('session_logs')
    .update({ logout_at: new Date().toISOString() })
    .eq('uid', uid)
    .is('logout_at', null)

  if (error) throw new Error(`[session-log.repository] markLogout: ${error.message}`)
}

/**
 * Cari semua sesi aktif (logout_at IS NULL) untuk uid + tenant tertentu.
 * SUPERADMIN: tenantId = null, query pakai IS NULL.
 * @param params - uid dan tenantId (null untuk SUPERADMIN)
 * @returns Array SessionLogRow. Kosong jika tidak ada sesi aktif.
 * @throws Error jika query DB gagal
 */
export async function findActiveByUid(params: {
  uid:      string
  tenantId: string | null
}): Promise<SessionLogRow[]> {
  const db = createServerSupabaseClient()
  let query = db
    .from('session_logs')
    .select('*')
    .eq('uid', params.uid)
    .is('logout_at', null)

  if (params.tenantId) {
    query = query.eq('tenant_id', params.tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query
  if (error) throw new Error(`[session-log.repository] findActiveByUid: ${error.message}`)
  return (data ?? []) as SessionLogRow[]
}
