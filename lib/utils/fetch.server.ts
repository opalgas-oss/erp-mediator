// lib/utils/fetch.server.ts
// Utilitas fetch dengan AbortController timeout
//
// Dibuat: Sesi #180 — SL-D004+K004
// Tujuan: Satu sumber kebenaran untuk pola fetch-timeout yang duplikat di:
//   - lib/services/provider-tester.ts (makeController() private helper, 7 call sites)
//   - lib/services/metrics-collector.service.ts (pingProvider() inline AbortController)
//
// Perbaikan vs implementasi lama:
//   - finally { clearTimeout(timer) } → tidak ada timer leak dalam kondisi apapun
//   - provider-tester.ts lama: catch { clear() } — clear dipanggil manual (rawan lupa)
//   - metrics-collector.service.ts lama: clearTimeout(t) SETELAH await → timer leak saat network error
//
// Terdaftar di cr_functions: CONFIG/infrastructure, is_shared=true

import 'server-only'

/**
 * Fetch dengan AbortController timeout.
 *
 * Timer di-clear via `finally` — tidak ada timer leak dalam kondisi apapun:
 *   - Request sukses   → finally clear timer ✓
 *   - Timeout abort    → finally clear timer (no-op, sudah fired) ✓
 *   - Network error    → finally clear timer ✓  ← fix vs pola lama
 *
 * @param url       - URL target
 * @param init      - RequestInit (headers, method, body, dll.) — signal TIDAK perlu diisi, akan di-override
 * @param timeoutMs - Timeout dalam ms sebelum request di-abort via AbortController
 * @returns         - Promise<Response> dari fetch — lempar error kalau timeout atau network error
 */
export async function fetchWithTimeout(
  url:       string,
  init:      RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
