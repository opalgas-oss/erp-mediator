// lib/services/credential-uji.service.ts
// Uji koneksi ke provider eksternal + penetapan health status manual
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
// PERTANYAAN YANG DIJAWAB BERKAS INI: "apakah koneksi ke provider X hidup, dan bagaimana hasilnya dicatat?"
//
// Pemetaan health status (jangan ditebak ulang):
//   sehat      = server terjangkau + terautentikasi
//   peringatan = server terjangkau + auth GAGAL
//   gagal      = server tidak terjangkau

import 'server-only'
import {
  getCredentialsByInstanceId,
  getProviderByInstanceId,
  spTestProviderConnection,
} from '@/lib/repositories/credential.repository'
import { dekripsiCredential } from '@/lib/credential-crypto'
import { testProvider }       from '@/lib/services/provider-tester'
import { ENV_FALLBACK }       from '@/lib/services/credential-env-fallback'
import type { TestKoneksiResult } from '@/lib/types/provider.types'

/**
 * Authenticated test koneksi ke provider eksternal.
 * Alur: cari provider kode dari instanceId → ambil credentials → call provider-tester → simpan hasil.
 * Signature baru S#109: tidak lagi butuh statusUrl — semua dilakukan internal.
 *
 * Health status mapping:
 *   sehat      = server reachable + terautentikasi
 *   peringatan = server reachable + auth gagal
 *   gagal      = server tidak bisa dijangkau
 */
export async function testKoneksi(instanceId: string): Promise<TestKoneksiResult> {
  // 1. Cari provider kode dari instance ini
  const providerInfo = await getProviderByInstanceId(instanceId)

  if (!providerInfo) {
    await spTestProviderConnection({
      instanceId,
      healthStatus:    'gagal',
      errorMessage:    'Instance atau provider tidak ditemukan di database',
      isAuthenticated: null,
    })
    return {
      berhasil:         false,
      is_authenticated: null,
      health_status:    'gagal',
      pesan:            'Instance atau provider tidak ditemukan',
      latency_ms:       0,
    }
  }

  // 2. Ambil credentials FRESH dari DB dengan dekripsiCredential (envelope encryption).
  //    S#216 FIX: simpanCredential pakai enkripsiCredential (DEK per field),
  //    tapi getAllByProvider pakai dekripsi (simple, Master Key langsung) — MISMATCH.
  //    Solusi: query langsung dengan encrypted_dek via getCredentialsByInstanceId,
  //    kemudian pakai dekripsiCredential(encrypted_dek, encrypted_value) yang benar.
  const credRows = await getCredentialsByInstanceId(instanceId)
  const credentials: Record<string, string> = {}
  for (const c of credRows) {
    try {
      credentials[c.field_key] = dekripsiCredential(c.encrypted_dek, c.encrypted_value)
    } catch { /* skip field yang gagal didekripsi */ }
  }
  // Env fallback: jika DB kosong, coba ambil dari .env (untuk provider lama yang belum migrasi ke DB)
  const envFields = ENV_FALLBACK[providerInfo.kode] ?? {}
  for (const [fieldKey, envKey] of Object.entries(envFields)) {
    if (!credentials[fieldKey]) {
      const val = process.env[envKey]
      if (val) credentials[fieldKey] = val
    }
  }

  // 3. Jalankan authenticated test via provider-tester.ts
  const result = await testProvider(providerInfo.kode, credentials)

  // 4. Simpan hasil ke DB
  await spTestProviderConnection({
    instanceId,
    healthStatus:    result.health_status,
    errorMessage:    result.pesan ?? undefined,
    isAuthenticated: result.is_authenticated,
    authError:       result.is_authenticated === false ? (result.pesan ?? undefined) : undefined,
  })

  return result
}

/**
 * Set health_status instance secara manual tanpa test koneksi.
 * Dipakai untuk provider tanpa field_defs (contoh: Healthchecks.io).
 * Status valid: 'dikonfigurasi_manual' | 'belum_dites'
 * S#337 — status baru untuk provider yang dikonfigurasi tanpa credential.
 */
export async function setStatusManual(
  instanceId:  string,
  healthStatus: string
): Promise<void> {
  await spTestProviderConnection({
    instanceId,
    healthStatus:     healthStatus as import('@/lib/types/provider.types').HealthStatus,
    isAuthenticated:  null,
    errorMessage:     undefined,
  })
}
