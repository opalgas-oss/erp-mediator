// lib/services/credential-baca.service.ts
// Baca NILAI credential untuk RUNTIME — cache 15 menit, dekripsi envelope, fallback .env
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
// PERTANYAAN YANG DIJAWAB BERKAS INI: "berapa nilai credential X sekarang, supaya sistem bisa memanggil provider-nya?"
//
// ⚠️ `getCredentialPlaintext` TIDAK di sini — ia melayani pra-isi dialog "Kelola" di Dashboard SA,
//    jadi rumahnya `credential-katalog.service.ts` (alasan berubahnya = kebutuhan LAYAR, bukan
//    strategi cache runtime). Diukur juga: menaruhnya di sini membuat berkas ini 88,4% batas
//    10 KB — mepet, dan mepet itulah yang memaksa pemecahan berulang tiap sesi.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { getConfigValue, parseConfigNumber } from '@/lib/config-registry'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAllByProvider } from '@/lib/repositories/credential.repository'
import { dekripsi, dekripsiCredential } from '@/lib/credential-crypto'
import { ENV_FALLBACK } from '@/lib/services/credential-env-fallback'

// ─── Service (existing) ──────────────────────────────────────────────────────

/**
 * Ambil satu credential field — dari DB via SP + cache 15 menit, atau env fallback.
 * useCase opsional: jika diisi, prioritaskan instance yang punya use_case tsb.
 * Fallback ke is_default=true jika tidak ada instance dengan use_case spesifik.
 */
export async function getCredential(
  providerKode: string,
  fieldKey:     string,
  useCase?:     string
): Promise<string | null> {
  const fromDB = await getCredentialFromDB(providerKode, fieldKey, useCase)
  if (fromDB !== null) return fromDB

  const envKey = ENV_FALLBACK[providerKode]?.[fieldKey]
  if (envKey) {
    const envVal = process.env[envKey] ?? null
    if (envVal) return envVal
  }

  return null
}

async function getCredentialFromDB(
  providerKode: string,
  fieldKey:     string,
  useCase?:     string
): Promise<string | null> {
  try {
    const ttlStr = await getConfigValue('platform_general', 'redis_ttl_credentials_seconds', '900')
    const ttl    = parseConfigNumber(ttlStr, 900)
    const cacheKey = useCase
      ? [`credential:${providerKode}:${fieldKey}:uc:${useCase}`]
      : [`credential:${providerKode}:${fieldKey}`]
    const cached = unstable_cache(
      async () => {
        // S#251 FIX: query langsung ke instance_credentials dengan encrypted_dek
        // S#288: tambah routing by use_case
        const db = createServerSupabaseClient()

        const { data: provider } = await db
          .from('service_providers')
          .select('id')
          .eq('kode', providerKode)
          .eq('is_aktif', true)
          .single()
        if (!provider) return null

        // Cari instance: prioritas use_case spesifik, fallback ke is_default
        let instance: { id: string } | null = null

        if (useCase) {
          const { data: ucInstance } = await db
            .from('provider_instances')
            .select('id')
            .eq('provider_id', provider.id)
            .eq('is_aktif', true)
            .contains('use_cases', [useCase])
            .limit(1)
            .single()
          instance = ucInstance ?? null
        }

        // Fallback: ambil instance is_default
        if (!instance) {
          const { data: defInstance } = await db
            .from('provider_instances')
            .select('id')
            .eq('provider_id', provider.id)
            .eq('is_aktif', true)
            .eq('is_default', true)
            .single()
          instance = defInstance ?? null
        }

        if (!instance) return null

        const { data: cred } = await db
          .from('instance_credentials')
          .select('encrypted_dek, encrypted_value, provider_field_definitions!inner(field_key, is_secret)')
          .eq('instance_id', instance.id)
          .eq('provider_field_definitions.field_key', fieldKey)
          .single()
        if (!cred) return null

        // Envelope encryption (format S#107+ — DEK per field)
        if (cred.encrypted_dek) {
          return dekripsiCredential(cred.encrypted_dek, cred.encrypted_value)
        }
        // Fallback: simple encryption (format lama sebelum S#107 — backward-compat)
        const def = Array.isArray(cred.provider_field_definitions)
          ? cred.provider_field_definitions[0]
          : cred.provider_field_definitions
        const defTyped = def as { field_key: string; is_secret: boolean } | null
        if (defTyped?.is_secret) return dekripsi(cred.encrypted_value)
        return cred.encrypted_value
      },
      cacheKey,
      { revalidate: ttl, tags: ['credentials', `credential:${providerKode}`] }
    )
    return await cached()
  } catch {
    return null
  }
}

/**
 * Ambil semua credential fields untuk satu provider — cache + env fallback.
 * Mengembalikan map field_key → nilai plaintext (sudah didekripsi).
 */
export async function getCredentialsByProvider(
  providerKode: string
): Promise<Record<string, string>> {
  const result:    Record<string, string> = {}
  const envFields: Record<string, string> = ENV_FALLBACK[providerKode] ?? {}

  try {
    const ttlStr = await getConfigValue('platform_general', 'redis_ttl_credentials_seconds', '900')
    const ttl    = parseConfigNumber(ttlStr, 900)
    const cached = unstable_cache(
      async () => {
        const creds = await getAllByProvider(providerKode)
        const map:  Record<string, string> = {}
        for (const c of creds) {
          try {
            if (c.encrypted_dek) {
              // Envelope encryption (format S#107+) — semua fields simpanCredential pakai enkripsiCredential
              map[c.field_key] = dekripsiCredential(c.encrypted_dek, c.encrypted_value)
            } else if (c.is_secret) {
              // Simple encryption (format lama, data sebelum S#107) — fallback backward-compat
              map[c.field_key] = dekripsi(c.encrypted_value)
            } else {
              // Non-secret tanpa DEK (data lama, tidak terenkripsi) — simpan as-is
              map[c.field_key] = c.encrypted_value
            }
          } catch { /* skip field gagal didekripsi */ }
        }
        return map
      },
      [`credentials:provider:${providerKode}`],
      { revalidate: ttl, tags: ['credentials', `credential:${providerKode}`] }
    )
    const fromDB = await cached()
    Object.assign(result, fromDB)
  } catch { /* fallback ke env */ }

  for (const [fieldKey, envKey] of Object.entries(envFields)) {
    if (!result[fieldKey]) {
      const val = process.env[envKey]
      if (val) result[fieldKey] = val
    }
  }

  return result
}
