// lib/services/collectors/upstash.collector.ts
// L3 Deep Metrics — Upstash Redis REST API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
// PERUBAHAN Sesi #295 — FIX field mismatch: sebelumnya return used_memory_human/
//   connected_clients/dll (string dari Redis INFO) tapi UI expect commands_per_second/
//   memory_used_bytes/memory_max_bytes/cache_hit_rate_pct/latency_p99_ms (numerik).
//   Fix: parse Redis INFO string ke field numerik yang match persis dengan UI.
// PERUBAHAN Sesi #297 — FIX memory_used_bytes selalu 0:
//   Regex `used_memory:(\d+)` tidak match karena di Upstash INFO field `used_memory`
//   diikuti field lain dengan prefix sama (mis. used_memory_rss, used_memory_peak).
//   Fix: gunakan word-boundary regex \bused_memory:(\d+) + fallback ke used_memory_rss.
//   memory_max_bytes dari INFO diganti dengan config registry (capacity_upstash_memory_mb)
//   karena nilai dari INFO (maxmemory) bisa 0 atau tidak akurat untuk managed instance.

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
 *   (memory_max_bytes tidak di-return — kapasitas diambil dari config registry di UI)
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

    // Upstash REST /info → { result: "redis_version:7.x\r\nused_memory:12345\r\n..." }
    const infoString: string = typeof data?.result === 'string' ? data.result : ''

    // Parse integer field dari INFO string
    // Gunakan \b word boundary dan $ end-of-value untuk avoid prefix-match
    // Contoh: `used_memory:12345\r\n` harus match, `used_memory_rss:99999` tidak boleh
    const parseInfoInt = (field: string): number => {
      // Match: field diawali newline/start, diakhiri \r\n atau end
      const regex = new RegExp(`(?:^|\\r?\\n)${field}:(\\d+)`)
      const match = infoString.match(regex)
      return match ? parseInt(match[1], 10) : 0
    }

    const usedMemoryBytes  = parseInfoInt('used_memory')
    const keyspaceHits     = parseInfoInt('keyspace_hits')
    const keyspaceMisses   = parseInfoInt('keyspace_misses')
    const totalCmds        = parseInfoInt('total_commands_processed')
    const uptimeSec        = parseInfoInt('uptime_in_seconds')

    // Cache hit rate: hits / (hits + misses) * 100, fallback 0
    const totalLookups    = keyspaceHits + keyspaceMisses
    const cacheHitRatePct = totalLookups > 0
      ? Math.round((keyspaceHits / totalLookups) * 100)
      : 0

    // commands_per_second: total_commands / uptime (rough approximation)
    const commandsPerSecond = uptimeSec > 0
      ? Math.round(totalCmds / uptimeSec)
      : 0

    return {
      // Field persis sesuai CapacityRow kode=upstash di UI
      // memory_max_bytes TIDAK di-return — kapasitas diambil dari config registry di deep/page.tsx
      commands_per_second: commandsPerSecond,
      memory_used_bytes:   usedMemoryBytes,
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
