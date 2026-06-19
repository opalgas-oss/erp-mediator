// lib/services/collectors/upstash.collector.ts
// L3 Deep Metrics — Upstash Redis REST API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
// PERUBAHAN Sesi #295 — FIX field mismatch: sebelumnya return used_memory_human/
//   connected_clients/dll (string dari Redis INFO) tapi UI expect commands_per_second/
//   memory_used_bytes/memory_max_bytes/cache_hit_rate_pct/latency_p99_ms (numerik).
//   Fix: parse Redis INFO string ke field numerik yang match persis dengan UI.
//
// Credential: getCredentialsByProvider('upstash').rest_url + rest_token
// Dikonfigurasi SuperAdmin di: Integrasi > API Provider > Upstash Redis
// Anti-hardcode: semua credential dari M3, tidak ada process.env di file ini.

import 'server-only'

/**
 * Kumpulkan deep metrics Upstash Redis via REST API.
 *
 * Credential yang dibutuhkan (dari M3):
 *   - rest_url:   URL REST endpoint (mis. https://xxx.upstash.io)
 *   - rest_token: REST token dari console.upstash.com
 *
 * Field output (sesuai UI deep/page.tsx MetricRow kode=upstash):
 *   commands_per_second, memory_used_bytes, memory_max_bytes,
 *   cache_hit_rate_pct, latency_p99_ms
 *
 * Endpoint:
 *   GET {rest_url}/info → Redis INFO command, return { result: "..." }
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
    const parseInt = (field: string): number => {
      const match = infoString.match(new RegExp(`${field}:(\\d+)`))
      return match ? parseInt(match[1], 10) : 0
    }

    const usedMemoryBytes  = parseInt('used_memory')
    const maxMemoryBytes   = parseInt('maxmemory')     // 0 = no limit (managed instance)
    const keyspaceHits     = parseInt('keyspace_hits')
    const keyspaceMisses   = parseInt('keyspace_misses')
    const totalCmds        = parseInt('total_commands_processed')
    const uptimeSec        = parseInt('uptime_in_seconds')

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
      // Field persis sesuai MetricRow kode=upstash di UI
      commands_per_second: commandsPerSecond,
      memory_used_bytes:   usedMemoryBytes,
      memory_max_bytes:    maxMemoryBytes > 0 ? maxMemoryBytes : null,
      cache_hit_rate_pct:  cacheHitRatePct,
      latency_p99_ms:      0,   // Tidak tersedia dari /info — butuh endpoint terpisah
      // Info tambahan
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
