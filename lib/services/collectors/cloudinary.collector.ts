// lib/services/collectors/cloudinary.collector.ts
// L3 Deep Metrics — Cloudinary Admin API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
//
// Credential: getCredentialsByProvider('cloudinary').cloud_name + api_key + api_secret
// Dikonfigurasi SuperAdmin di: Integrasi > API Provider > Cloudinary
// Anti-hardcode: semua credential dari M3, tidak ada process.env di file ini.

import 'server-only'

/**
 * Kumpulkan deep metrics Cloudinary via Admin API.
 *
 * Credential yang dibutuhkan (dari M3):
 *   - cloud_name: Nama cloud Cloudinary (mis. mycloud)
 *   - api_key:    API Key dari console.cloudinary.com
 *   - api_secret: API Secret dari console.cloudinary.com
 *
 * Endpoint target:
 *   GET https://api.cloudinary.com/v1_1/{cloud_name}/usage
 *   Auth: Basic Auth (api_key:api_secret, base64-encoded)
 */
export async function collectCloudinaryMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const cloudName = creds['cloud_name']
  const apiKey    = creds['api_key']
  const apiSecret = creds['api_secret']

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      _note:   'Credential Cloudinary belum dikonfigurasi di M3',
      _source: 'Integrasi > API Provider > Cloudinary',
    }
  }

  try {
    // Basic Auth: base64(api_key:api_secret)
    const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/usage`,
      {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type':  'application/json',
        },
      }
    )

    if (!res.ok) {
      return {
        _error:        `Cloudinary API error ${res.status}`,
        _token_source: 'M3 Credential Management (cloudinary)',
      }
    }

    const data = await res.json()

    // Cloudinary /usage response shape:
    // { storage: { usage, limit }, bandwidth: { usage, limit }, requests: number,
    //   resources: number, derived_resources: number, ... }
    return {
      storage_used_bytes:     data?.storage?.usage        ?? 0,
      storage_limit_bytes:    data?.storage?.limit        ?? 0,
      storage_used_pct:       data?.storage?.usage_percent  ?? 0,
      bandwidth_used_bytes:   data?.bandwidth?.usage      ?? 0,
      bandwidth_limit_bytes:  data?.bandwidth?.limit      ?? 0,
      bandwidth_used_pct:     data?.bandwidth?.usage_percent ?? 0,
      api_calls_used:         data?.requests              ?? 0,
      total_resources:        data?.resources             ?? 0,
      derived_resources:      data?.derived_resources     ?? 0,
      _token_source:          'M3 Credential Management (cloudinary)',
    }
  } catch (err) {
    return {
      _error:        String(err),
      _token_source: 'M3 Credential Management (cloudinary)',
    }
  }
}
