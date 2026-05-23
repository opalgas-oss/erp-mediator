// lib/repositories/otp.repository.ts
// Repository untuk tabel otp_codes — akses DB via SP untuk verify.
// Dibuat: Sesi #051 — BLOK B-03 TODO_ARSITEKTUR_LAYER_v1
// Fix BUG-005 Sesi #059: hapus filter dipakai=false dari DELETE
//   → tabel punya unique constraint (tenant_id, uid)
//   → DELETE harus hapus SEMUA OTP lama (used + unused) sebelum insert baru

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe Data ──────────────────────────────────────────────────────────────

export type OTPVerifyResult = 'OK' | 'EXPIRED' | 'WRONG' | 'NOT_FOUND' | 'ALREADY_USED'

export interface UpsertOTPParams {
  uid:       string
  tenantId:  string
  kode:      string
  expiredAt: string  // ISO timestamp
}

// ─── Repository ─────────────────────────────────────────────────────────────

/**
 * Hapus SEMUA OTP lama (used + unused) lalu insert OTP baru untuk uid+tenant.
 * Catatan: tabel punya unique constraint (tenant_id, uid) — DELETE wajib hapus semua
 * sebelum insert agar tidak langgar constraint saat ada OTP lama yang sudah dipakai.
 * @param params - uid, tenantId, kode (6 digit), expiredAt (ISO timestamp)
 * @throws Error jika insert DB gagal
 */
export async function upsert(params: UpsertOTPParams): Promise<void> {
  const db = createServerSupabaseClient()

  // Hapus SEMUA OTP lama untuk uid+tenant ini (used + unused)
  // Alasan: unique constraint (tenant_id, uid) — kalau hanya hapus dipakai=false,
  // baris lama yang dipakai=true akan memblokir INSERT baru (error 23505)
  await db
    .from('otp_codes')
    .delete()
    .eq('uid', params.uid)
    .eq('tenant_id', params.tenantId)

  // Insert OTP baru
  const { error } = await db
    .from('otp_codes')
    .insert({
      uid:        params.uid,
      tenant_id:  params.tenantId,
      kode:       params.kode,
      expired_at: params.expiredAt,
      dipakai:    false,
    })

  if (error) throw new Error(`[otp.repository] upsert: ${error.message}`)
}

/**
 * Panggil SP sp_verify_and_consume_otp — atomic verify + tandai OTP sudah dipakai.
 * Race-condition safe karena pakai SELECT FOR UPDATE di dalam SP.
 * @param params - uid, tenantId, inputCode (kode yang dimasukkan user)
 * @returns OTPVerifyResult: 'OK' | 'EXPIRED' | 'WRONG' | 'NOT_FOUND' | 'ALREADY_USED'
 * @throws Error jika SP gagal dieksekusi
 */
export async function spVerifyAndConsume(params: {
  uid:       string
  tenantId:  string
  inputCode: string
}): Promise<OTPVerifyResult> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.rpc('sp_verify_and_consume_otp', {
    p_uid:        params.uid,
    p_tenant_id:  params.tenantId,
    p_input_code: params.inputCode,
  })

  if (error) throw new Error(`[otp.repository] spVerifyAndConsume: ${error.message}`)
  return (data as { result: OTPVerifyResult }).result
}
