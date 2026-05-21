// lib/geo-server.ts
// Helper baca Vercel geolocation headers di server-side (Server Action / Route Handler).
//
// Dibuat: Sesi #194 (21 Mei 2026) — FIX HUTANG-GPS-BLOCKING
// Eliminasi 781ms GPS+Nominatim blocking dari critical path login.
//
// LATAR BELAKANG:
// Vercel menyediakan x-vercel-ip-* di SEMUA request, semua plan termasuk Hobby
// (changelog "IP Geolocation now available for all plans", 12 November 2021).
// Header ter-inject di Edge Network — 0ms overhead di Server Action.
//
// CATATAN AKURASI:
// - country: ~95%+ accurate (ISO alpha-2)
// - city:    medium accuracy. Mobile carrier (Telkomsel/Indosat) sering egress
//            lewat Jakarta → user mobile dari kota tier-2/3 bisa ter-label "Jakarta".
//            Untuk audit/analytics log: SUDAH CUKUP.
//            Untuk delivery routing / business-critical: TIDAK CUKUP (pakai GPS presisi
//            di halaman terpisah dengan consent eksplisit per UU PDP).
//
// FALLBACK:
// - Local dev: header tidak ter-set → return '' (acceptable di local).
// - Cloudflare proxy di depan Vercel: header bisa kosong/wrong → pastikan DNS
//   resolve langsung ke Vercel (jangan proxy).
//
// COMPLIANCE:
// - UU PDP No. 27/2022 Indonesia: city-level dari IP = compliant (legitimate
//   interest untuk audit). GPS presisi koordinat = butuh consent eksplisit
//   (Pasal 16 data minimization).
// - Nominatim Usage Policy: solusi ini menghindari pelanggaran rate limit 1 req/s
//   dan larangan komersial multi-tenant.
//
// SUMBER:
// - https://vercel.com/changelog/ip-geolocation-now-available-for-all-plans
// - https://vercel.com/docs/headers/request-headers
// - https://operations.osmfoundation.org/policies/nominatim/

import { headers } from 'next/headers'

export interface GeoFromVercel {
  kota:    string  // x-vercel-ip-city (decoded RFC3986)
  country: string  // x-vercel-ip-country (ISO 3166-1 alpha-2, e.g. 'ID')
  region:  string  // x-vercel-ip-country-region (ISO 3166-2)
}

/**
 * Baca informasi geo dari Vercel headers untuk audit log.
 * Aman dipanggil di Server Action / Route Handler — TIDAK throw exception.
 *
 * Penggunaan:
 *   const geo = await getGeoForAudit()
 *   const gpsKota = geo.kota || 'Tidak Diketahui'
 *
 * @returns GeoFromVercel — string kosong jika header tidak ada (local dev)
 */
export async function getGeoForAudit(): Promise<GeoFromVercel> {
  const h = await headers()

  const decode = (raw: string | null): string => {
    if (!raw) return ''
    try { return decodeURIComponent(raw) } catch { return raw }
  }

  return {
    kota:    decode(h.get('x-vercel-ip-city')),
    country: h.get('x-vercel-ip-country')        ?? '',
    region:  h.get('x-vercel-ip-country-region') ?? '',
  }
}
