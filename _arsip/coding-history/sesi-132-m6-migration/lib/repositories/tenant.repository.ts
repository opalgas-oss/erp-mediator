// lib/repositories/tenant.repository.ts
// Repository untuk tabel tenants — akses DB only.
// TIDAK ada logika bisnis — hanya query dan return data.
// Dibuat: Sesi #053 — FIX #6 Audit Logic FASE 1
//
// ARSITEKTUR:
//   Service → TenantRepository → DB (tabel tenants)
//   Dipakai oleh: AccountLockService, OTPService, dan service lain yang butuh data tenant.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe Data ──────────────────────────────────────────────────────────────

/** Hasil lookup nama brand tenant */
export interface TenantNamaBrandResult {
  id:         string
  nama_brand: string
}

// ─── FUNGSI: findNamaBrandById ───────────────────────────────────────────────
/**
 * Ambil nama_brand tenant berdasarkan ID.
 * @param tenantId - UUID tenant yang dicari
 * @returns TenantNamaBrandResult jika ditemukan, null jika tidak ada
 */
export async function findNamaBrandById(
  tenantId: string
): Promise<TenantNamaBrandResult | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenants')
    .select('id, nama_brand')
    .eq('id', tenantId)
    .single()

  if (error || !data) return null
  return data as TenantNamaBrandResult
}

// ─── FUNGSI: findDefaultNamaBrand ────────────────────────────────────────────
/**
 * Ambil nama_brand dari tenant aktif pertama sebagai fallback.
 * Dipakai saat tenantId tidak tersedia (misal: SUPERADMIN send notifikasi).
 * @returns TenantNamaBrandResult jika ada tenant aktif, null jika tidak ada
 */
export async function findDefaultNamaBrand(): Promise<TenantNamaBrandResult | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenants')
    .select('id, nama_brand')
    .eq('status', 'aktif')
    .limit(1)
    .single()

  if (error || !data) return null
  return data as TenantNamaBrandResult
}
