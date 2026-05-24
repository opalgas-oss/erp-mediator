// lib/utils/otp-only.server.ts
// Helper server-side untuk fitur OTP Mode Login: otp_only (Pengganti Password)
// Dibuat: Sesi #209 — Fitur OTP Mode Login per Role (TDD Step 2)
//
// Fungsi di file ini dipakai oleh initOtpOnlyAction + finishOtpOnlyAction
// di app/login/actions.ts untuk flow login tanpa password via WA OTP.
//
// Registry: code_registry.cr_functions
//   - getNomorWaSuperAdmin — AUTH/otp_only — is_shared=false (khusus SA)

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── getNomorWaSuperAdmin ─────────────────────────────────────────────────────
/**
 * Ambil nomor WA pertama SuperAdmin dari tabel users.
 * SA tidak ada di user_profiles — datanya di tabel users dengan nomor_wa = text[].
 *
 * Return string kosong jika SA tidak ditemukan atau nomor_wa kosong.
 * Kondisi string kosong di initOtpOnlyAction → fallback ke password (per FSD 5.3).
 *
 * @param uid - UUID SuperAdmin (dari JWT atau DB lookup)
 * @returns Nomor WA SA (format 62xxx), atau '' jika tidak ada
 */
export async function getNomorWaSuperAdmin(uid: string): Promise<string> {
  const adminDb = createServerSupabaseClient()
  const { data, error } = await adminDb
    .from('users')
    .select('nomor_wa')
    .eq('id', uid)
    .maybeSingle()

  if (error || !data) return ''

  // nomor_wa di tabel users bertipe text[] — ambil elemen pertama
  const arr = data.nomor_wa as string[] | null
  return arr?.[0] ?? ''
}

// ─── lookupUserByNomorWa ──────────────────────────────────────────────────────
/**
 * Cari user berdasarkan nomor WA — dipakai oleh initOtpOnlyAction.
 * Cek user_profiles dulu (Vendor/Customer/AdminTenant), lalu users (SA).
 * Normalisasi nomor HP: terima format +628xxx, 08xxx, 628xxx → normalisasi ke 62xxx.
 *
 * @param nomorHpInput - Nomor HP yang diinput user di form otp_only
 * @returns Array profil yang cocok, atau [] jika tidak ditemukan
 */
export interface OtpOnlyUserProfile {
  id:        string
  email:     string
  nama:      string
  role:      string
  tenant_id: string | null
  nomor_wa:  string   // nomor WA yang tersimpan di DB (ke sini OTP akan dikirim)
  source:    'user_profiles' | 'users'
}

export function normalisasiNomorWa(input: string): { norm: string; alt: string } {
  // Hapus karakter non-digit kecuali tanda +
  const clean = input.replace(/[\s\-().]/g, '')
  let norm = clean

  // +628xxx → 628xxx
  if (norm.startsWith('+62')) norm = norm.slice(1)
  // 08xxx → 628xxx
  else if (norm.startsWith('0')) norm = '62' + norm.slice(1)
  // 8xxx → 628xxx (tanpa awalan)
  else if (norm.startsWith('8')) norm = '62' + norm

  // alt = format dengan awalan 0 (untuk backward compat data lama)
  const alt = '0' + norm.slice(2)

  return { norm, alt }
}

export async function lookupUserByNomorWa(nomorHpInput: string): Promise<OtpOnlyUserProfile[]> {
  const { norm, alt } = normalisasiNomorWa(nomorHpInput)
  const adminDb = createServerSupabaseClient()
  const results: OtpOnlyUserProfile[] = []

  // ── Cek 1: user_profiles (Vendor / Customer / AdminTenant) ─────────────────
  const { data: profiles } = await adminDb
    .from('user_profiles')
    .select('id, email, nama, role, tenant_id, nomor_wa')
    .or(`nomor_wa.eq.${norm},nomor_wa.eq.${alt}`)
    .eq('status', 'aktif')
    .limit(5)

  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      results.push({
        id:        p.id,
        email:     p.email ?? '',
        nama:      p.nama ?? '',
        role:      p.role ?? '',
        tenant_id: p.tenant_id ?? null,
        nomor_wa:  p.nomor_wa ?? norm,
        source:    'user_profiles',
      })
    }
    return results
  }

  // ── Cek 2: users (SuperAdmin) — nomor_wa di SA adalah text[] ──────────────
  let saData = null
  const { data: saByNorm } = await adminDb
    .from('users')
    .select('id, email, nama, role, nomor_wa')
    .contains('nomor_wa', [norm])
    .limit(1)
  saData = saByNorm?.[0] ?? null

  if (!saData) {
    const { data: saByAlt } = await adminDb
      .from('users')
      .select('id, email, nama, role, nomor_wa')
      .contains('nomor_wa', [alt])
      .limit(1)
    saData = saByAlt?.[0] ?? null
  }

  if (saData) {
    const waArr = saData.nomor_wa as string[] | null
    results.push({
      id:        saData.id,
      email:     saData.email ?? '',
      nama:      saData.nama ?? '',
      role:      saData.role ?? 'super_admin',
      tenant_id: null,
      nomor_wa:  waArr?.[0] ?? norm,
      source:    'users',
    })
  }

  return results
}
