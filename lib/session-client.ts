// lib/session-client.ts
// Fungsi session yang berjalan di BROWSER (client-side only).
// Dipindahkan dari lib/session.ts untuk separation client/server.
// Dibuat: Sesi #052 — BLOK D-01 TODO_ARSITEKTUR_LAYER_v1
//
// FUNGSI YANG DIPINDAHKAN:
//   - getDeviceInfo()     — baca user agent browser
//   - getGPSLocation()    — baca GPS via navigator.geolocation
//   - generateOTP()       — utilitas generate kode acak
//
// TIDAK BOLEH import 'server-only' — file ini untuk browser.
// TIDAK BOLEH import dari supabase-server atau repository.

// ─── Interface internal ──────────────────────────────────────────────────────

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

// ─── FUNGSI: getDeviceInfo ───────────────────────────────────────────────────
// Baca browser dan OS dari user agent. Return string deskriptif.
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

// ─── GPS Cache ───────────────────────────────────────────────────────────────

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

// ─── FUNGSI: getGPSLocation ──────────────────────────────────────────────────
// Ambil koordinat GPS + reverse geocode ke nama kota via Nominatim.
// Cache di sessionStorage sesuai TTL dari config.
export async function getGPSLocation(opts?: GPSOpts): Promise<{
  lat: number; lng: number; kota: string
}> {
  if (typeof window === 'undefined') throw new Error('GPS_SERVER')
  if (!navigator.geolocation)        throw new Error('GPS_DITOLAK')

  const timeoutMs  = opts?.timeoutMs  ?? 10000
  const cacheTtlMs = opts?.cacheTtlMs ?? (30 * 60 * 1000)

  // Cek cache sessionStorage
  try {
    const raw = sessionStorage.getItem(GPS_CACHE_KEY)
    if (raw) {
      const cache = JSON.parse(raw) as GPSCache
      const ageMs = Date.now() - cache.timestamp
      if (ageMs < cacheTtlMs && cache.kota && cache.kota !== 'Tidak Diketahui') {
        return { lat: cache.lat, lng: cache.lng, kota: cache.kota }
      }
    }
  } catch { /* cache corrupt — ambil fresh */ }

  // Ambil koordinat dari browser GPS
  const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      ()    => reject(new Error('GPS_DITOLAK')),
      { timeout: timeoutMs, enableHighAccuracy: false, maximumAge: 60000 }
    )
  })

  const lat = coords.latitude
  const lng = coords.longitude
  let kota  = 'Tidak Diketahui'

  // Reverse geocode via Nominatim
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
  } catch { /* Nominatim gagal — kota tetap "Tidak Diketahui" */ }

  // Simpan ke cache
  if (kota !== 'Tidak Diketahui') {
    try {
      const cache: GPSCache = { lat, lng, kota, timestamp: Date.now() }
      sessionStorage.setItem(GPS_CACHE_KEY, JSON.stringify(cache))
    } catch { /* sessionStorage penuh — abaikan */ }
  }

  return { lat, lng, kota }
}

// ─── FUNGSI: generateOTP ─────────────────────────────────────────────────────
// Utilitas sederhana — generate kode OTP 6 digit.
// Catatan: server-side OTP generation sudah di OTPService.
export function generateOTP(): string {
  const angka = Math.floor(Math.random() * 1_000_000)
  return angka.toString().padStart(6, '0')
}
