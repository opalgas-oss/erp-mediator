// lib/services/collectors/upstash.collector.ts
// L3 Deep Metrics — Upstash Redis REST API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
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
 * Endpoint target:
 *   POST {rest_url}/info — Redis INFO command via REST
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

    // Upstash REST /info mengembalikan { result: "..." } berisi INFO string Redis
    // Parse key metrics dari string INFO jika tersedia
    const infoString: string = typeof data?.result === 'string' ? data.result : ''
    const parseField = (field: string): string | null => {
      const match = infoString.match(new RegExp(`${field}:(\\S+)`))
      return match ? match[1] : null
    }

    return {
      used_memory_human:    parseField('used_memory_human')    ?? null,
      connected_clients:    parseField('connected_clients')    ?? null,
      total_commands_processed: parseField('total_commands_processed') ?? null,
      keyspace_hits:        parseField('keyspace_hits')        ?? null,
      keyspace_misses:      parseField('keyspace_misses')      ?? null,
      uptime_in_seconds:    parseField('uptime_in_seconds')    ?? null,
      _raw:                 data,
      _token_source:        'M3 Credential Management (upstash.rest_token)',
    }
  } catch (err) {
    return {
      _error:        String(err),
      _token_source: 'M3 Credential Management (upstash.rest_token)',
    }
  }
}
