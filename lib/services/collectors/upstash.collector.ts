// lib/services/collectors/upstash.collector.ts
// L3 Deep Metrics — Upstash Redis REST API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
// PERUBAHAN Sesi #295 — FIX field mismatch: parse Redis INFO string ke field numerik UI.
// PERUBAHAN Sesi #297 — coba fix memory_used_bytes via regex used_memory (ternyata salah field).
// PERUBAHAN Sesi #298 — FIX FINAL memory_used_bytes selalu 0:
//   Root cause terbukti dari _raw_info_sample aktual: Upstash serverless TIDAK melaporkan
//   `used_memory` seperti Redis biasa — field itu selalu 0 (engine memory tidak diekspos).
//   Field yang benar untuk "data terpakai" di Upstash adalah `total_data_size`,
//   dengan kapasitas `max_data_size` (256 MB = 268435456 bytes, cocok dengan config).
//   Fix: gunakan total_data_size sebagai memory_used_bytes. Fallback ke used_memory bila ada.
//   Field debug S#298 (_result_type/_info_length/_raw_info_sample) DIHAPUS.

import 'server-only'

/**
 * Kumpulkan deep metrics Upstash Redis via REST API.
 *
 * Credential yang dibutuhkan (dari M3):
 *   - rest_url:   URL REST endpoint (mis. https://xxx.upstash.io)
 *   - rest_token: REST token dari console.upstash.com
 *
 * Field output (sesuai UI deep/page.tsx CapacityRow kode=upstash):
 *   commands_per_second, memory_used_bytes, cache_hit_rate_pct, latency_p99_ms
 *   (kapasitas memory diambil dari config registry capacity_upstash_memory_mb di UI)
 *
 * Catatan format INFO Upstash (terverifikasi S#298):
 *   used_memory   → SELALU 0 di Upstash serverless (engine memory tidak diekspos)
 *   total_data_size → ukuran data tersimpan (field yang benar untuk "memory terpakai")
 *   max_data_size   → kapasitas data (256 MB di Free plan)
 */
export async function collectUpstashMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const restUrl   = creds['rest_url']
  const restToken = creds['rest_token']

  if (!restUrl || !restToken) {
    return {
      _note:   'rest_url atau rest_token belum dikonfigurasi di M3',
      _source: 'Integrasi > API Provider > Upstash Redis',
    }
  }

  try {
    const res = await fetch(`${restUrl}/info`, {
      headers: { 'Authorization': `Bearer ${restToken}` },
      signal:  AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      return {
        _error:        `Upstash INFO error ${res.status}`,
        _token_source: 'M3 Credential Management (upstash.rest_token)',
      }
    }

    const data = await res.json()

    // Upstash REST /info → { result: "redis_version:8.x\r\nused_memory:0\r\n..." }
    const infoString: string = typeof data?.result === 'string' ? data.result : ''

    // Parse integer field dari INFO string — match line persis (hindari prefix-match)
    const parseInfoInt = (field: string): number => {
      const regex = new RegExp(`(?:^|\\r?\\n)${field}:(\\d+)`)
      const match = infoString.match(regex)
      return match ? parseInt(match[1], 10) : 0
    }

    // Memory terpakai: Upstash serverless pakai total_data_size (used_memory selalu 0).
    // Fallback ke used_memory bila total_data_size tidak ada (kompatibilitas instance lain).
    const totalDataSize    = parseInfoInt('total_data_size')
    const usedMemoryLegacy  = parseInfoInt('used_memory')
    const memoryUsedBytes   = totalDataSize > 0 ? totalDataSize : usedMemoryLegacy

    const keyspaceHits     = parseInfoInt('keyspace_hits')
    const keyspaceMisses   = parseInfoInt('keyspace_misses')
    const totalCmds        = parseInfoInt('total_commands_processed')
    const uptimeSec        = parseInfoInt('uptime_in_seconds')
    const opsPerSec        = parseInfoInt('instantaneous_ops_per_sec')

    // Cache hit rate: hits / (hits + misses) * 100, fallback 0
    const totalLookups    = keyspaceHits + keyspaceMisses
    const cacheHitRatePct = totalLookups > 0
      ? Math.round((keyspaceHits / totalLookups) * 100)
      : 0

    // commands_per_second: pakai instantaneous_ops_per_sec bila ada,
    // fallback ke rata-rata total_commands / uptime
    const commandsPerSecond = opsPerSec > 0
      ? opsPerSec
      : (uptimeSec > 0 ? Math.round(totalCmds / uptimeSec) : 0)

    return {
      // Field persis sesuai CapacityRow kode=upstash di UI
      commands_per_second: commandsPerSecond,
      memory_used_bytes:   memoryUsedBytes,
      cache_hit_rate_pct:  cacheHitRatePct,
      latency_p99_ms:      0,   // Tidak tersedia dari /info — butuh endpoint terpisah
      // Info tambahan (untuk debug, tidak di-render UI)
      _keyspace_hits:      keyspaceHits,
      _keyspace_misses:    keyspaceMisses,
      _uptime_seconds:     uptimeSec,
      _token_source:       'M3 Credential Management (upstash.rest_token)',
    }
  } catch (err) {
    return {
      _error:        String(err),
      _token_source: 'M3 Credential Management (upstash.rest_token)',
    }
  }
}
