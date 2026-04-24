// lib/repositories/account-lock.repository.ts
// Repository untuk tabel account_locks — akses DB via Stored Procedures.
// HANYA query/mutasi DB. TIDAK ada logika bisnis.
// Dibuat: Sesi #051 — BLOK B-01 TODO_ARSITEKTUR_LAYER_v1

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe Data ──────────────────────────────────────────────────────────────

export interface AccountLockDoc {
  uid:            string
  email:          string
  nama:           string
  nomor_wa:       string
  tenant_id:      string | null
  count:          number
  lock_count:     number
  status:         string
  lock_until:     string | null
  locked_at:      string | null
  unlock_at:      string | null
  unlocked_by:    string | null
  unlock_method:  string | null
  last_attempt_at?: string
}

export interface IncrementLockResult {
  locked:     boolean
  lock_until: string | null
  count:      number
  lock_count: number
}

export interface UnlockResult {
  success:    boolean
  matched_by: 'uid' | 'email' | null
}

// ─── Repository ─────────────────────────────────────────────────────────────

/**
 * Cari record account_locks berdasarkan email.
 * @param email - Email user yang dicari
 * @returns AccountLockDoc jika ditemukan, null jika tidak ada
 */
export async function findByEmail(email: string): Promise<AccountLockDoc | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('account_locks')
    .select('*')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as AccountLockDoc
}

/**
 * Panggil SP sp_increment_lock_count — atomic increment + lock jika melebihi batas.
 * SP menerima config sebagai parameter (bukan baca DB sendiri).
 * @param params - email, uid, nama, nomor_wa, tenant_id, max_attempts, lock_duration_minutes
 * @returns IncrementLockResult berisi locked, lock_until, count, lock_count
 * @throws Error jika SP gagal dieksekusi
 */
export async function spIncrementLockCount(params: {
  email:                string
  uid:                  string
  nama?:                string
  nomor_wa?:            string
  tenant_id?:           string | null
  max_attempts:         number
  lock_duration_minutes: number
}): Promise<IncrementLockResult> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.rpc('sp_increment_lock_count', {
    p_email:                 params.email,
    p_uid:                   params.uid,
    p_nama:                  params.nama ?? null,
    p_nomor_wa:              params.nomor_wa ?? null,
    p_tenant_id:             params.tenant_id ?? null,
    p_max_attempts:          params.max_attempts,
    p_lock_duration_minutes: params.lock_duration_minutes,
  })

  if (error) throw new Error(`[account-lock.repository] spIncrementLockCount: ${error.message}`)
  return data as IncrementLockResult
}

/**
 * Panggil SP sp_unlock_account — coba unlock via uid dulu, fallback email.
 * @param params - uid, email, method (auto|manual), unlocked_by
 * @returns UnlockResult berisi success dan matched_by ('uid'|'email'|null)
 * @throws Error jika SP gagal dieksekusi
 */
export async function spUnlockAccount(params: {
  uid?:          string | null
  email?:        string | null
  method:        string
  unlocked_by?:  string | null
}): Promise<UnlockResult> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.rpc('sp_unlock_account', {
    p_uid:         params.uid ?? null,
    p_email:       params.email ?? null,
    p_method:      params.method,
    p_unlocked_by: params.unlocked_by ?? null,
  })

  if (error) throw new Error(`[account-lock.repository] spUnlockAccount: ${error.message}`)
  return data as UnlockResult
}
