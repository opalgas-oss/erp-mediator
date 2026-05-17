// lib/repositories/account-lock.repository.ts
// Repository untuk tabel account_locks — akses DB via Stored Procedures.
// HANYA query/mutasi DB. TIDAK ada logika bisnis.
// Dibuat: Sesi #051 — BLOK B-01 TODO_ARSITEKTUR_LAYER_v1

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
 * FIX T-035 Sesi #166: tambah p_progressive_enabled + p_max_lock_duration_minutes
 * @param params - 9 parameter (7 original + 2 baru T-035)
 */
export async function spIncrementLockCount(params: {
  email:                       string
  uid:                         string
  nama?:                       string
  nomor_wa?:                   string
  tenant_id?:                  string | null
  max_attempts:                number
  lock_duration_minutes:       number
  progressive_enabled?:        boolean
  max_lock_duration_minutes?:  number
}): Promise<IncrementLockResult> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.rpc('sp_increment_lock_count', {
    p_email:                      params.email,
    p_uid:                        params.uid,
    p_nama:                       params.nama ?? null,
    p_nomor_wa:                   params.nomor_wa ?? null,
    p_tenant_id:                  params.tenant_id ?? null,
    p_max_attempts:               params.max_attempts,
    p_lock_duration_minutes:      params.lock_duration_minutes,
    p_progressive_enabled:        params.progressive_enabled ?? false,
    p_max_lock_duration_minutes:  params.max_lock_duration_minutes ?? 1440,
  })

  if (error) throw new Error(`[account-lock.repository] spIncrementLockCount: ${error.message}`)
  return data as IncrementLockResult
}

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
