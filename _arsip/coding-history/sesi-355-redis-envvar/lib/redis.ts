// lib/redis.ts
// Client Redis (Upstash) untuk L1 cache di API route handlers.
//
// Dibuat Sesi #045 — mengacu PERFORMANCE_STANDARDS_v1.md Poin 7:
//   "Pola cache-aside: cek Redis dulu (1–10ms), miss → query Supabase (50–150ms)
//    → simpan ke Redis TTL dari config_registry."
//
// Credentials dibaca dari instance_credentials via getCredential() — dengan fallback
// ke env vars (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// unstable_cache di credential-reader memastikan credential call cepat setelah warm.
//
// TTL dikelola di config_registry (platform_general):
//   - redis_ttl_config_seconds      → TTL cache config registry
//   - redis_ttl_messages_seconds    → TTL cache message library
//   - redis_ttl_credentials_seconds → TTL cache credential API
//
// REDIS_TTL di bawah adalah FALLBACK DEFAULT jika key belum ada di DB.
// Sumber kebenaran adalah config_registry — bukan file ini.

import 'server-only'
import { Redis }          from '@upstash/redis'
import { getCredential }  from '@/lib/credential-reader'

let _client: Redis | null = null
let _initAttempted        = false

// ─── Inisialisasi Redis Client — lazy, dipanggil per invocation ───────────────
export async function getRedisClient(): Promise<Redis | null> {
  if (_initAttempted) return _client
  _initAttempted = true

  try {
    // getCredential() coba DB dulu (unstable_cache 15 menit), fallback ke env var:
    // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
    const restUrl   = await getCredential('upstash', 'rest_url')
    const restToken = await getCredential('upstash', 'rest_token')

    if (!restUrl || !restToken) {
      console.warn('[redis] Upstash credentials tidak ditemukan — Redis dinonaktifkan')
      return null
    }

    _client = new Redis({ url: restUrl, token: restToken })
    return _client
  } catch (err) {
    console.error('[redis] Gagal inisialisasi:', err)
    return null
  }
}

// ─── Fallback TTL (dalam detik) — SUMBER KEBENARAN ada di config_registry ─────
// Nilai ini HARUS cocok dengan nilai di DB (platform_general):
//   redis_ttl_config_seconds      = 600
//   redis_ttl_messages_seconds    = 900
//   redis_ttl_credentials_seconds = 900
// Dipakai hanya jika key belum ada di DB atau getConfigValue() gagal.
export const REDIS_TTL = {
  CONFIG:      600,
  MESSAGES:    900,
  CREDENTIALS: 900,
} as const
