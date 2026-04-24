/**
 * lib/session.ts
 * ⚠️ DEPRECATED Sesi #052 — Dipecah menjadi:
 *   Browser-only: lib/session-client.ts (getGPSLocation, getDeviceInfo, generateOTP)
 *   Server-side:  lib/services/session.service.ts (writeSessionLog, markLogout)
 *   Server-side:  lib/services/otp.service.ts (verifyAndConsume)
 *   Hook:         lib/hooks/useBiometric.ts (registerBiometric, verifyBiometric)
 *
 *   File ini MASIH dipakai oleh useLoginFlow.ts (writeSessionLog, verifyOTP, register/verifyBiometric).
 *   JANGAN import file ini dari file baru — gunakan file pecahan di atas.
 *   Akan dihapus setelah useLoginFlow.ts dimigrasikan (BLOK E-08).
 * Helper fungsi session untuk platform ERP Mediator Hyperlocal.
 * Mencakup: GPS, device info, session log, OTP verify, biometric (WebAuthn).
 * Dapat diimport di browser (client component) maupun server.
 *
 * PERUBAHAN Sesi #038:
 *   - getGPSLocation: terima optional opts { timeoutMs, cacheTtlMs } dari config_registry
 *     Nilai default tetap tersedia sebagai fallback aman
 *   - sendOTPviaWA dan saveOTPtoFirestore sudah dihapus — diganti /api/auth/send-otp
 *   - registerBiometric: baca trusted_device_days dari config_registry via API
 *
 * PERUBAHAN Sesi #039:
 *   - writeSessionLog: tenantId bertipe string | null — SUPERADMIN kirim null bukan ''
 *     (empty string bukan UUID valid → Supabase 400 Bad Request)
 */

import { createBrowserSupabaseClient } from '@/lib/supabase-client'

// ---------------------------------------------------------------------------
// Interface internal
// ---------------------------------------------------------------------------

interface NominatimResponse {
  address: {
    neighbourhood?: string
    suburb?:        string
    village?:       string
    town?:          string
    city_district?: string
    county?:        string
    city?:          string
    state?:         string
  }
}

// ---------------------------------------------------------------------------
// 1. getDeviceInfo — TIDAK BERUBAH
// ---------------------------------------------------------------------------

export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Server'

  const ua = navigator.userAgent

  let browser = 'Browser Tidak Dikenal'
  if (ua.includes('Edg/'))                              browser = 'Edge'
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera'
  else if (ua.includes('Chrome/'))                      browser = 'Chrome'
  else if (ua.includes('Firefox/'))                     browser = 'Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari'

  let os = 'OS Tidak Dikenal'
  if (ua.includes('iPhone')) {
    const m = ua.match(/CPU iPhone OS (\d+)/); os = m ? `iPhone iOS ${m[1]}` : 'iPhone'
  } else if (ua.includes('iPad')) {
    const m = ua.match(/CPU OS (\d+)/); os = m ? `iPad iOS ${m[1]}` : 'iPad'
  } else if (ua.includes('Android')) {
    const m = ua.match(/Android (\d+)/); os = m ? `Android ${m[1]}` : 'Android'
  } else if (ua.includes('Windows NT 10.0')) { os = 'Windows 10'
  } else if (ua.includes('Windows NT 6.3'))  { os = 'Windows 8.1'
  } else if (ua.includes('Windows NT 6.1'))  { os = 'Windows 7'
  } else if (ua.includes('Macintosh')) {
    const m = ua.match(/Mac OS X ([\d_]+)/); os = m ? `Mac OS X ${m[1].replace(/_/g, '.')}` : 'Mac'
  } else if (ua.includes('Linux')) { os = 'Linux' }

  return `${browser} / ${os}`
}

// ---------------------------------------------------------------------------
// 2. getGPSLocation — timeout dan cache TTL dari config_registry via parameter
//    Nilai default (fallback) dipakai kalau opts tidak diberikan
// ---------------------------------------------------------------------------

const GPS_CACHE_KEY = 'erp_gps_cache'

interface GPSCache {
  lat:       number
  lng:       number
  kota:      string
  timestamp: number
}

export interface GPSOpts {
  timeoutMs?:  number   // Default: 10000ms (10 detik) — dari config gps_timeout_seconds
  cacheTtlMs?: number   // Default: 30 menit — dari config gps_cache_ttl_minutes
}

export async function getGPSLocation(opts?: GPSOpts): Promise<{
  lat: number; lng: number; kota: string
}> {
  if (typeof window === 'undefined') throw new Error('GPS_SERVER')
  if (!navigator.geolocation)        throw new Error('GPS_DITOLAK')

  const timeoutMs  = opts?.timeoutMs  ?? 10000           // 10 detik fallback
  const cacheTtlMs = opts?.cacheTtlMs ?? (30 * 60 * 1000) // 30 menit fallback

  // Cek cache sessionStorage — kalau masih valid, pakai langsung
  try {
    const raw = sessionStorage.getItem(GPS_CACHE_KEY)
    if (raw) {
      const cache = JSON.parse(raw) as GPSCache
      const ageMs = Date.now() - cache.timestamp
      if (ageMs < cacheTtlMs && cache.kota && cache.kota !== 'Tidak Diketahui') {
        return { lat: cache.lat, lng: cache.lng, kota: cache.kota }
      }
    }
  } catch { /* cache corrupt — abaikan, ambil fresh */ }

  // Ambil koordinat dari browser GPS
  const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      ()    => reject(new Error('GPS_DITOLAK')),
      {
        timeout:            timeoutMs,
        enableHighAccuracy: false,
        maximumAge:         60000,
      }
    )
  })

  const lat = coords.latitude
  const lng = coords.longitude
  let kota  = 'Tidak Diketahui'

  try {
    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), 5000)
    const response   = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { signal: controller.signal }
    )
    clearTimeout(timer)
    if (response.ok) {
      const data = (await response.json()) as NominatimResponse
      const a = data.address

      const area    = a.suburb ?? a.village ?? a.neighbourhood ?? a.town ?? ''
      const wilayah = a.city_district ?? a.county ?? a.city ?? a.state ?? ''

      if (area && wilayah) {
        kota = `${area}, ${wilayah}`
      } else {
        kota = area || wilayah || (a.city ?? a.state ?? 'Tidak Diketahui')
      }
    }
  } catch { /* Nominatim gagal atau timeout — kota tetap "Tidak Diketahui" */ }

  // Simpan ke cache — hanya kalau kota berhasil didapat
  if (kota !== 'Tidak Diketahui') {
    try {
      const cache: GPSCache = { lat, lng, kota, timestamp: Date.now() }
      sessionStorage.setItem(GPS_CACHE_KEY, JSON.stringify(cache))
    } catch { /* sessionStorage penuh atau tidak tersedia — abaikan */ }
  }

  return { lat, lng, kota }
}

// ---------------------------------------------------------------------------
// 3. writeSessionLog — tabel session_logs
//    tenantId: string | null — SUPERADMIN tidak punya tenant, kirim null
//    (empty string '' bukan UUID valid → Supabase tolak dengan 400 Bad Request)
// ---------------------------------------------------------------------------

export async function writeSessionLog(params: {
  uid:      string
  tenantId: string | null
  email:    string
  role:     string
  lat:      number
  lng:      number
  kota:     string
}): Promise<string> {
  const sessionId = crypto.randomUUID()
  const supabase  = createBrowserSupabaseClient()

  await supabase
    .from('session_logs')
    .insert({
      id:         sessionId,
      session_id: sessionId,
      uid:        params.uid,
      tenant_id:  params.tenantId || null,  // '' → null untuk SUPERADMIN
      role:       params.role,
      device:     getDeviceInfo(),
      gps_kota:   params.kota,
      login_at:   new Date().toISOString(),
      logout_at:  null,
    })

  return sessionId
}

// ---------------------------------------------------------------------------
// 4. generateOTP — utilitas sederhana
// ---------------------------------------------------------------------------

export function generateOTP(): string {
  const angka = Math.floor(Math.random() * 1_000_000)
  return angka.toString().padStart(6, '0')
}

// ---------------------------------------------------------------------------
// 5. verifyOTP — tabel otp_codes
// CATATAN: Generate + simpan + kirim OTP dilakukan server-side via /api/auth/send-otp
//   - Credential Fonnte   : instance_credentials (credential-reader)
//   - Template pesan      : message_library (Modul Pesan)
//   - Config OTP          : config_registry (Modul Konfigurasi)
// ---------------------------------------------------------------------------

export async function verifyOTP(params: {
  uid:       string
  inputCode: string
  tenantId:  string
}): Promise<boolean | 'EXPIRED'> {
  const supabase = createBrowserSupabaseClient()

  const { data, error } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('uid', params.uid)
    .eq('tenant_id', params.tenantId)
    .single()

  if (error || !data) return false
  if (data.dipakai)   return false
  if (new Date(data.expired_at) < new Date()) return 'EXPIRED'
  if (data.kode !== params.inputCode) return false

  await supabase
    .from('otp_codes')
    .update({ dipakai: true })
    .eq('uid', params.uid)
    .eq('tenant_id', params.tenantId)

  return true
}

// ---------------------------------------------------------------------------
// 6. registerBiometric — tabel trusted_devices
//    trusted_device_days dibaca dari config_registry via /api/config/security_login
// ---------------------------------------------------------------------------

export async function registerBiometric(params: {
  uid:      string
  tenantId: string
}): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.credentials || !window.PublicKeyCredential) {
    return false
  }

  try {
    // Baca trusted_device_days dari Modul Konfigurasi via API
    let trustedDays = 30 // fallback aman
    try {
      const res  = await fetch('/api/config/security_login')
      const data = await res.json()
      if (data.success && data.data) {
        const allItems: Array<{ policy_key?: string; nilai?: string }> =
          data.data.flatMap((g: { items: Array<{ policy_key?: string; nilai?: string }> }) => g.items)
        const item = allItems.find(i => i.policy_key === 'trusted_device_days')
        if (item?.nilai) trustedDays = Number(item.nilai) || 30
      }
    } catch { /* pakai default 30 hari */ }

    await navigator.credentials.create({
      publicKey: {
        challenge:              crypto.getRandomValues(new Uint8Array(32)),
        rp:                     { name: 'ERP Mediator', id: window.location.hostname },
        user:                   { id: new TextEncoder().encode(params.uid), name: params.uid, displayName: params.uid },
        pubKeyCredParams:       [{ alg: -7, type: 'public-key' }],
        timeout:                trustedDays > 0 ? 60000 : 60000,
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      },
    })

    const deviceId = crypto.randomUUID()
    const supabase = createBrowserSupabaseClient()

    await supabase
      .from('trusted_devices')
      .insert({
        id:            deviceId,
        device_id:     deviceId,
        uid:           params.uid,
        tenant_id:     params.tenantId,
        device_name:   getDeviceInfo(),
        registered_at: new Date().toISOString(),
        last_used_at:  new Date().toISOString(),
      })

    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// 7. verifyBiometric — tabel trusted_devices
// ---------------------------------------------------------------------------

export async function verifyBiometric(params: {
  uid:      string
  tenantId: string
}): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.credentials) return false

  try {
    const supabase = createBrowserSupabaseClient()

    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id')
      .eq('uid', params.uid)
      .eq('tenant_id', params.tenantId)
      .limit(1)

    if (error || !data || data.length === 0) return false

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge:        crypto.getRandomValues(new Uint8Array(32)),
        timeout:          60000,
        userVerification: 'required',
      },
    })

    return assertion !== null
  } catch {
    return false
  }
}
