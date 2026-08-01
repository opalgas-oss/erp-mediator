// lib/services/credential-katalog.service.ts
// Yang DITAMPILKAN di Dashboard SA: daftar provider / instance / field def / fingerprint + pra-isi dialog Kelola
// Bagian dari klaster `credential.service` — barrel-nya tetap `lib/services/credential.service.ts`,
// sehingga SELURUH pemanggil lama TIDAK perlu diubah satu baris pun.
//   Lahir: Sesi #428 — 1 Agustus 2026, pemecahan `lib/services/credential.service.ts`
//   **17.721 B = 173% batas 10 KB** atas keputusan Philips K-428-3. Verbatim: "file
//   credential.service.ts, lakukan split menjadi beberapa cluster berdasarkan kategori / fungsi /
//   modul / apapun yang sesuai denga karakter project kita sehingga memudahkan kamu bekerja".
//   Sumbu = ALASAN BERUBAH (sama seperti `app-error.service.ts` S#427 dan `lib/maintenance.ts`
//   S#428) — bukan ukuran, bukan urutan penulisan:
//     credential-env-fallback  → berubah saat NAMA VARIABEL .env berubah
//     credential-baca          → berubah saat strategi CACHE / DEKRIPSI runtime berubah
//     credential-katalog       → berubah saat yang DITAMPILKAN di Dashboard SA berubah
//     credential-ubah          → berubah saat BENTUK PAYLOAD tulis berubah
//     credential-uji           → berubah saat pemetaan HEALTH / provider-tester berubah
//   Batas tiap blok DIHITUNG PROGRAM (mundur dari `export` sampai awal JSDoc-nya), bukan ditebak —
//   tebakan pertama S#428 memotong JSDoc `toggleProviderIsAktif` dan menukar JSDoc
//   `getCredentialPlaintext` ke klaster yang salah. Ditangkap uji balik, bukan lolos.
//   Isi dipindah MEKANIS per-baris dari salinan byte-exact ber-checksum
//   (SHA-256 ac179ce6…c3c3e, 17.721 B) — nol karakter kode diketik ulang, nol komentar dipangkas
//   (K-426-2). Arsip: `_arsip/coding-history/sesi-428-credential-split/`.
//
// PERTANYAAN YANG DIJAWAB BERKAS INI: "apa yang harus muncul di layar halaman Konfigurasi > API Provider?"
//
// ⛔ DUA TINGKAT KERAHASIAAN, jangan tertukar:
//    · `listCredentialFingerprints` → HANYA 4 karakter terakhir. Aman untuk tabel.
//    · `getCredentialPlaintext`     → nilai ASLI, untuk pra-isi form "Kelola". SA-ONLY, dan route
//      pemanggilnya WAJIB punya gerbang auth. Jangan pernah dipakai mengisi tabel/daftar.

import 'server-only'
import {
  getProvidersWithStatus,
  getInstancesByProvider,
  getFieldDefinitions,
  getCredentialFingerprints,
  getCredentialsByInstanceId,
} from '@/lib/repositories/credential.repository'
import { dekripsiCredential } from '@/lib/credential-crypto'
import type {
  ServiceProvider,
  ProviderInstance,
  ProviderFieldDef,
  InstanceCredential,
} from '@/lib/types/provider.types'

// ─── Service (M3 — UI Dashboard) — Sesi #107 ─────────────────────────────────

/**
 * List semua provider aktif beserta health_overall.
 * Dipakai di panel kiri halaman /providers.
 */
export async function listProviders(): Promise<ServiceProvider[]> {
  return getProvidersWithStatus()
}

/**
 * List semua instance untuk satu provider.
 * Dipakai di panel kanan halaman /providers saat provider dipilih.
 */
export async function listInstances(providerId: string): Promise<ProviderInstance[]> {
  return getInstancesByProvider(providerId)
}

/**
 * Ambil field definitions untuk satu provider.
 * Dipakai untuk render form dialog Konfigurasi Koneksi secara dinamis.
 */
export async function listFieldDefs(providerId: string): Promise<ProviderFieldDef[]> {
  return getFieldDefinitions(providerId)
}

/**
 * Ambil fingerprint credential per instance — untuk tampil di UI.
 * Nilai asli TIDAK di-expose — hanya 4 karakter terakhir.
 */
export async function listCredentialFingerprints(instanceId: string): Promise<InstanceCredential[]> {
  return getCredentialFingerprints(instanceId)
}

/**
 * Ambil credential plaintext untuk satu instance — dipakai UI "Kelola" untuk pre-fill form.
 * Mengembalikan DUA map: byFieldDefId (untuk isi cred state dialog) + byFieldKey (untuk referensi).
 * SA only — tidak boleh dipakai di context browser langsung tanpa auth gate di route.
 */
export async function getCredentialPlaintext(instanceId: string): Promise<{
  byFieldDefId: Record<string, string>
  byFieldKey:   Record<string, string>
}> {
  const rows = await getCredentialsByInstanceId(instanceId)
  const byFieldDefId: Record<string, string> = {}
  const byFieldKey:   Record<string, string>   = {}

  for (const row of rows) {
    try {
      const val = dekripsiCredential(row.encrypted_dek, row.encrypted_value)
      byFieldDefId[row.field_def_id] = val
      byFieldKey[row.field_key]      = val
    } catch { /* skip field yang gagal didekripsi */ }
  }

  return { byFieldDefId, byFieldKey }
}
