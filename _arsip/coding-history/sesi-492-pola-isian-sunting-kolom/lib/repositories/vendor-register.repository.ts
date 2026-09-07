// lib/repositories/vendor-register.repository.ts
// Repository pendaftaran vendor — tabel vendor_register_submissions + vendor_register_answers.
// Dibuat: Sesi #486 (migrasi s486_create_vendor_register_submissions & ..._answers).
//
// Layer Repository. HANYA query DB di sini.
// 🔴 Jawaban disimpan BARIS-PER-KOLOM. Menambah kolom formulir = menambah baris data,
//   ⛔ BUKAN menambah kolom tabel (SPEK §3 K3 — inilah yang K-483-4 minta).

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { PersetujuanVendor } from '@/lib/types/vendor-register.types'

export interface BuatSubmissionPayload {
  user_id:                string
  tenant_id:              string
  form_key:               string
  status:                 string
  versi_teks_persetujuan: string | null
  kanal:                  string
  persetujuan:            PersetujuanVendor
}

/** Satu baris jawaban siap tulis. `nilai_json` dipakai untuk `multiselect`, `nilai` untuk sisanya. */
export interface BarisJawaban {
  field_key:  string
  nilai:      string | null
  nilai_json: string[] | null
}

// ─── submission ───────────────────────────────────────────────────────────────
export async function VendorRegisterRepo_buatSubmission(
  payload: BuatSubmissionPayload,
): Promise<string> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('vendor_register_submissions')
    .insert({
      user_id:                payload.user_id,
      tenant_id:              payload.tenant_id,
      form_key:               payload.form_key,
      status:                 payload.status,
      versi_teks_persetujuan: payload.versi_teks_persetujuan,
      waktu_setuju:           new Date().toISOString(),
      kanal:                  payload.kanal,
      setuju_snk:             payload.persetujuan.snk,
      setuju_data_pribadi:    payload.persetujuan.data_pribadi,
      setuju_pasal_3_3:       payload.persetujuan.pasal_3_3,
    })
    .select('id')
    .single()

  if (error) throw new Error(`VendorRegisterRepo_buatSubmission: ${error.message}`)
  return String((data as { id: string }).id)
}

// ─── jawaban ──────────────────────────────────────────────────────────────────
/** Tulis seluruh jawaban satu pendaftaran. Kosong = tidak menulis apa pun (bukan galat). */
export async function VendorRegisterRepo_simpanJawaban(
  submissionId: string,
  baris:        BarisJawaban[],
): Promise<number> {
  if (baris.length === 0) return 0

  const db = createServerSupabaseClient()
  const { error } = await db.from('vendor_register_answers').insert(
    baris.map((b) => ({
      submission_id: submissionId,
      field_key:     b.field_key,
      nilai:         b.nilai,
      nilai_json:    b.nilai_json,
    })),
  )

  if (error) throw new Error(`VendorRegisterRepo_simpanJawaban(${submissionId}): ${error.message}`)
  return baris.length
}

// ─── rollback ─────────────────────────────────────────────────────────────────
/**
 * Hapus submission (jawaban ikut terhapus lewat ON DELETE CASCADE).
 * Dipakai HANYA sebagai pemulihan saat langkah berikutnya gagal — supaya tidak ada
 * pendaftaran separuh jadi yang menghalangi pendaftar mencoba lagi.
 */
export async function VendorRegisterRepo_hapusSubmission(submissionId: string): Promise<void> {
  const db = createServerSupabaseClient()
  const { error } = await db.from('vendor_register_submissions').delete().eq('id', submissionId)
  if (error) {
    console.error(`[vendor-register.repository] rollback submission gagal: ${error.message}`)
  }
}
