// lib/repositories/app-error.repository.ts
// Query murni tabel `app_error_log` — dedup laporan gangguan aplikasi.
// Dibuat: Sesi #424 — FASE 3.6e jalur EMAIL (K-422-1 langkah 6 + K-417-3).
//
// KENAPA JALUR EMAIL, BUKAN WA (keputusan Philips S#424, dicatat verbatim):
//   "untuk Support Problem hampir / sebagian besar tidak menggunakan komunikasi via WA, tapi harus
//    melalui Email. Karena keterkaitan dengan Audit Trail dan Log History Problem sebuah aplikasi
//    dan memastikan tidak ada penyelesaian case karena subjektif ke dekatan personal."
//   ⇒ Tabel inilah audit trail-nya. WA adalah pelengkap, BUKAN pengganti.
//
// AREA RAWAN yang dijaga di sini (Bug_Master):
//   · NOL `catch {}` kosong (BUG-034 · BUG-038) — fitur anti-bug-senyap DILARANG jadi bug senyap.
//   · NOL subquery PostgREST (BUG-038) — semua filter datar.
//   · `is_active` vs `is_aktif` (BUG-039) — tabel ini tidak punya kolom itu, nol risiko.
//
// Kolom nyata (diverifikasi `information_schema` S#424, BUKAN dari dokumen):
//   id · route_path(NN) · menu_key · nama_halaman · digest · pesan · area(NN) · uid · tenant_id
//   · user_agent · dedup_key(NN) · occurrence_count(NN,d1) · first_occurred_at(NN,now())
//   · last_occurred_at(NN,now()) · status(NN,'BARU') · resolved_at · resolved_by · catatan
// CHECK terverifikasi: area ∈ (publik|super_admin|admin_tenant|vendor) · status ∈ (BARU|DITANGANI|SELESAI)

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export type AreaError = 'publik' | 'super_admin' | 'admin_tenant' | 'vendor'

export interface AppErrorInput {
  route_path:   string
  menu_key:     string | null
  nama_halaman: string | null
  digest:       string | null
  pesan:        string | null
  area:         AreaError
  uid:          string | null
  tenant_id:    string | null
  user_agent:   string | null
  dedup_key:    string
}

export interface AppErrorUpsertResult {
  id:               string
  occurrence_count: number
  /** true = baris BARU lahir · false = baris lama dinaikkan hitungannya */
  baris_baru:       boolean
}

// ─── appErrorRepo_upsertDedup ─────────────────────────────────────────────────
/**
 * Catat satu kejadian gangguan dengan dedup (K-417-3).
 *
 * Kejadian dengan `dedup_key` SAMA yang `last_occurred_at`-nya masih di dalam jendela
 * `dedupMinutes` **menaikkan `occurrence_count`**, BUKAN membuat baris baru. Di luar jendela,
 * baris baru lahir — supaya gangguan yang kambuh berminggu kemudian tidak tertimbun ke insiden lama.
 *
 * Dipakai dua-arah oleh pemanggil: `baris_baru` menentukan apakah email perlu dikirim, sehingga
 * satu gangguan yang diklik 50 kali TIDAK menghasilkan 50 email.
 *
 * @param input        - data kejadian
 * @param dedupMinutes - lebar jendela dedup (config `monitoring.error_report_dedup_minutes`)
 */
export async function appErrorRepo_upsertDedup(
  input:        AppErrorInput,
  dedupMinutes: number
): Promise<AppErrorUpsertResult> {
  const db = createServerSupabaseClient()

  const batasWaktu = new Date(Date.now() - dedupMinutes * 60_000).toISOString()

  // Filter DATAR — nol subquery PostgREST (BUG-038).
  const { data: existing, error: errCari } = await db
    .from('app_error_log')
    .select('id, occurrence_count')
    .eq('dedup_key', input.dedup_key)
    .gte('last_occurred_at', batasWaktu)
    .order('last_occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (errCari) {
    throw new Error(`appErrorRepo_upsertDedup gagal mencari duplikat: ${errCari.message}`)
  }

  if (existing) {
    const hitunganBaru = (existing.occurrence_count ?? 1) + 1

    const { error: errUpdate } = await db
      .from('app_error_log')
      .update({
        occurrence_count: hitunganBaru,
        last_occurred_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (errUpdate) {
      throw new Error(`appErrorRepo_upsertDedup gagal menaikkan hitungan: ${errUpdate.message}`)
    }

    return { id: existing.id, occurrence_count: hitunganBaru, baris_baru: false }
  }

  const { data: inserted, error: errInsert } = await db
    .from('app_error_log')
    .insert({
      route_path:   input.route_path,
      menu_key:     input.menu_key,
      nama_halaman: input.nama_halaman,
      digest:       input.digest,
      pesan:        input.pesan,
      area:         input.area,
      uid:          input.uid,
      tenant_id:    input.tenant_id,
      user_agent:   input.user_agent,
      dedup_key:    input.dedup_key,
      // occurrence_count · first/last_occurred_at · status = DEFAULT kolom (1 · now() · 'BARU')
    })
    .select('id, occurrence_count')
    .single()

  if (errInsert) {
    throw new Error(`appErrorRepo_upsertDedup gagal menyimpan: ${errInsert.message}`)
  }

  return {
    id:               inserted.id,
    occurrence_count: inserted.occurrence_count ?? 1,
    baris_baru:       true,
  }
}
