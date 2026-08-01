// lib/services/credential-ubah.service.ts
// Semua MUTASI: tambah provider/instance, simpan credential, toggle aktif, patch use_case & dampak bisnis
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
// PERTANYAAN YANG DIJAWAB BERKAS INI: "bagaimana cara mengubah data provider / instance / credential?"
//
// ⛔ ENKRIPSI dilakukan DI SINI (service layer) — bukan di repository, bukan di route.
//    `simpanCredential` memakai envelope encryption: tiap field punya DEK sendiri, DEK-nya
//    dienkripsi Master Key. Repository hanya menerima nilai yang SUDAH terenkripsi.

import 'server-only'
import {
  insertInstance,
  upsertCredential,
  insertProvider,
  insertFieldDef,
  updateProviderIsAktif,
  updateInstanceUseCases,
  updateInstanceBusinessImpact,
} from '@/lib/repositories/credential.repository'
import { enkripsiCredential } from '@/lib/credential-crypto'
import type {
  ServiceProvider,
  ProviderInstance,
  TambahInstancePayload,
  TambahProviderPayload,
  SimpanCredentialPayload,
} from '@/lib/types/provider.types'

/**
 * Tambah instance baru untuk satu provider.
 */
export async function tambahInstance(
  payload: TambahInstancePayload,
  userId:  string
): Promise<ProviderInstance> {
  return insertInstance({
    provider_id:     payload.provider_id,
    nama_server:     payload.nama_server,
    deskripsi:       payload.deskripsi,
    is_default:      payload.is_default,
    business_impact: payload.business_impact ?? null,   // S#349 B3
    created_by:      userId,
  })
}

/**
 * Enkripsi dan simpan credential fields untuk satu instance.
 * Envelope encryption: setiap field punya DEK unik, DEK dienkripsi Master Key.
 * Enkripsi dilakukan di sini (service layer) — TIDAK di repository atau route.
 */
export async function simpanCredential(
  payload: SimpanCredentialPayload,
  userId:  string
): Promise<void> {
  for (const field of payload.fields) {
    if (!field.nilai || field.nilai.trim() === '') continue

    const { encrypted_dek, encrypted_value, fingerprint: fp } =
      enkripsiCredential(field.nilai)

    await upsertCredential({
      instance_id:     payload.instance_id,
      field_def_id:    field.field_def_id,
      encrypted_dek,
      encrypted_value,
      fingerprint:     fp,
      updated_by:      userId,
    })
  }
}

/**
 * Tambah provider baru ke Supabase + field definitions-nya.
 * Auto-generate kode dari nama: lowercase, non-alphanumeric diganti underscore.
 * Validasi unik kode via UNIQUE constraint Supabase.
 * S#218 - fitur Tambah Provider dashboard SA.
 */
export async function tambahProvider(
  payload: TambahProviderPayload,
  userId:  string
): Promise<ServiceProvider> {
  const kode = payload.nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  const provider = await insertProvider({
    kode,
    nama:      payload.nama,
    kategori:  payload.kategori,
    tag:       payload.tag,
    deskripsi: payload.deskripsi,
    docs_url:  payload.docs_url,
  })

  for (const fd of payload.field_defs) {
    await insertFieldDef({
      provider_id: provider.id,
      field_key:   fd.field_key,
      label:       fd.label,
      tipe:        fd.tipe,
      is_required: fd.is_required,
      is_secret:   fd.is_secret,
      placeholder: fd.placeholder,
      deskripsi:   fd.deskripsi,
      sort_order:  fd.sort_order,
    })
  }

  void userId
  return provider
}

/**
 * Toggle is_aktif satu provider — nonaktifkan atau aktifkan kembali.
 * Provider nonaktif tetap muncul di tabel tapi tidak dibaca sistem runtime.
 * S#249 — HUTANG-PROVIDER-INACTIVE.
 */
export async function toggleProviderIsAktif(
  providerId: string,
  isAktif:    boolean
): Promise<void> {
  return updateProviderIsAktif(providerId, isAktif)
}

/**
 * Update business_impact satu instance.
 * S#349 — B3 Dampak Bisnis.
 */
export async function patchInstanceBusinessImpact(
  instanceId:    string,
  businessImpact: string | null
): Promise<void> {
  return updateInstanceBusinessImpact(instanceId, businessImpact)
}

/**
 * Update use_cases satu instance.
 * S#288 — FASE 2 use_case.
 */
export async function patchInstanceUseCases(
  instanceId: string,
  useCases:   string[]
): Promise<void> {
  return updateInstanceUseCases(instanceId, useCases)
}
