// lib/services/credential.service.ts
// Service layer untuk credential management.
// Enkripsi/dekripsi dilakukan di sini (bukan di repository atau route).
// Dibuat: Sesi #052 — BLOK C-02 TODO_ARSITEKTUR_LAYER_v1
// Update: Sesi #107 — M3 Credential Management (+5 fungsi UI dashboard)
// Update: Sesi #109 — M3 Step 5.2b: testKoneksi() → authenticated test via provider-tester.ts
// Update: Sesi #216 — FIX: bypass cache + dekripsiCredential di testKoneksi + getCredentialPlaintext untuk UI Kelola
// Update: Sesi #217 — fix getCredentialsByProvider: dekripsiCredential jika DEK ada, fallback dekripsi jika tidak
// Update: Sesi #248 — ROLLBACK: hapus listFieldDefsAll + toggleFieldDefIsAktif + import terkait
// Update: Sesi #249 — HUTANG-PROVIDER-INACTIVE: tambah toggleProviderIsAktif
// Update: Sesi #349 — B3: tambah patchInstanceBusinessImpact
// Update: Sesi #251 — FIX: getCredentialFromDB pakai query langsung + dekripsiCredential (envelope encryption)
// Update: Sesi #428 — K-428-3: berkas ini DIPECAH jadi 5 klaster (17.721 B = 173% batas 10 KB).
//   Berkas ini kini BARREL TIPIS: nol logika, hanya meneruskan ekspor. Seluruh pemanggil lama
//   TETAP mengimpor dari `@/lib/services/credential.service` dan TIDAK berubah satu baris pun —
//   itu sebabnya barrel dipilih, bukan mengubah puluhan titik impor tanpa alasan.
//
// PETA — cari fungsinya di mana:
//   `credential-env-fallback.ts`      ENV_FALLBACK (peta nama variabel .env; TIDAK diekspor keluar)
//   `credential-baca.service.ts`      getCredential · getCredentialsByProvider
//   `credential-katalog.service.ts`   listProviders · listInstances · listFieldDefs ·
//                                     listCredentialFingerprints · getCredentialPlaintext
//   `credential-ubah.service.ts`      tambahInstance · simpanCredential · tambahProvider ·
//                                     toggleProviderIsAktif · patchInstanceBusinessImpact ·
//                                     patchInstanceUseCases
//   `credential-uji.service.ts`       testKoneksi · setStatusManual
//
// ATURAN PAKAI: fungsi BARU ditulis ke klaster yang sesuai, BUKAN ke berkas ini. Logika yang
// muncul lagi di sini = pelanggaran, pindahkan. Arsip pra-pemecahan byte-exact:
// `_arsip/coding-history/sesi-428-credential-split/lib/services/credential.service.ts`
// (SHA-256 ac179ce6…c3c3e, 17.721 B).

export * from '@/lib/services/credential-baca.service'
export * from '@/lib/services/credential-katalog.service'
export * from '@/lib/services/credential-ubah.service'
export * from '@/lib/services/credential-uji.service'

// ─── Re-export untuk caller yang butuh fungsi crypto ─────────────────────────
export { enkripsiCredential, dekripsi, fingerprint } from '@/lib/credential-crypto'
