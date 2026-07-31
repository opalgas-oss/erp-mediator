// lib/utils/perangkat-pelapor.util.ts
// KATEGORI: penguraian BROWSER + PERANGKAT pelapor gangguan dari header `user_agent`.
//
// Dibuat: Sesi #426 — perintah K-424-5 bagian A poin 2.
// Satu dari tiga berkas hasil pemecahan (ATURAN 10):
//   · `ip-pelapor.util.ts`                     — membaca ALAMAT IP dari header
//   · `perangkat-pelapor.util.ts` (berkas ini) — mengurai BROWSER + PERANGKAT dari `user_agent`
//   · `penanda-laporan.util.ts`                — membentuk insiden_key · sidik_profil · dedup_key
//
// ═══ KENAPA DIURAI DI SERVER, BUKAN DIKIRIM KLIEN ════════════════════════════════════════════
// Perintah K-424-5 poin 2 (Philips): browser + perangkat diurai dari `user_agent` **DI SERVER**,
// bukan dikirim klien. Nilai yang datang dari body permintaan bisa dipalsukan pengunjung; kalau
// jenis perangkat bisa dipalsukan, PENAHANAN PER-PROFIL bisa dilewati dengan mengarang isian.
// `import 'server-only'` membuat kesalahan itu MUSTAHIL secara mekanis: Client Component yang
// mengimpor berkas ini akan MENGGAGALKAN `npm run build`, bukan lolos diam-diam.
//
// ═══ ⚠️ KEMIRIPAN DENGAN `getDeviceInfo()` — DISEBUT TERBUKA, BUKAN TERLEWAT ═════════════════
// `getDeviceInfo()` di `lib/session-client.ts` (terdaftar di `cr_functions`: TRACKING/session,
// `is_shared=true`) kegunaannya tercatat sebagai "nama browser dan os pengguna" — MIRIP dengan
// `uraiProfilPerangkat()` di bawah, dan skor kemiripan kegunaannya tinggi (ATURAN 19 / ATURAN 2
// STEP 2B). Ia TIDAK dipakai ulang, dan alasannya MEKANIS — bukan selera:
//   1. Baris pertamanya `if (typeof window === 'undefined') return 'Server'` — ia berjalan di
//      BROWSER. Dipanggil dari server, ia hanya menjawab 'Server', bukan nama peramban.
//   2. Ia membaca `navigator.userAgent` — MILIK KLIEN. Persis yang K-424-5 poin 2 larang.
//   3. Keluarannya SATU string gabungan ("Chrome / Windows 10"); Supabase memisahkannya menjadi
//      DUA kolom, `browser` dan `perangkat`.
// Dicatat di sini supaya sesi berikutnya tidak menyangka salah satunya kembar yang lolos audit —
// pola pencatatan yang sama sudah dipakai S#423 untuk `isiVariabel()` vs `interpolate()`.

import 'server-only'

// ─── Nilai jaga-jaga ──────────────────────────────────────────────────────────
// `sidik_profil` adalah kolom NOT NULL tanpa nilai bawaan (diverifikasi `information_schema`
// S#426), dan ia dibentuk dari kedua nilai di berkas ini. Karena itu fungsi di sini WAJIB SELALU
// mengembalikan string berisi — tidak boleh ada jalur yang menghasilkan string kosong.
export const TIDAK_DIKENAL = 'Tidak dikenal'

// Batas panjang — pagar terhadap `user_agent` raksasa yang dikarang penyerang.
const BATAS_BROWSER   = 60
const BATAS_PERANGKAT = 60

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface ProfilPerangkat {
  /** Jenis + versi peramban. Contoh: `Chrome 150` */
  browser:   string
  /** Jenis perangkat. Contoh: `Desktop Windows`, `Ponsel Android` */
  perangkat: string
}

// ─── uraiProfilPerangkat ──────────────────────────────────────────────────────
/**
 * Urai jenis peramban + jenis perangkat dari `user_agent`, DI SERVER (K-424-5 poin 2).
 *
 * @param userAgent - isi header `user-agent`. Boleh null (permintaan tanpa header).
 * @returns dua nilai yang SELALU terisi — tidak pernah string kosong.
 */
export function uraiProfilPerangkat(userAgent: string | null): ProfilPerangkat {
  const ua = (userAgent ?? '').trim()

  if (ua === '') {
    return { browser: TIDAK_DIKENAL, perangkat: TIDAK_DIKENAL }
  }

  return {
    browser:   uraiBrowser(ua).slice(0, BATAS_BROWSER),
    perangkat: uraiPerangkat(ua).slice(0, BATAS_PERANGKAT),
  }
}

// ─── Penguraian peramban ──────────────────────────────────────────────────────
/**
 * ⚠️ URUTAN PEMERIKSAAN DI BAWAH SENGAJA BEGINI DAN TIDAK BOLEH DIACAK.
 *
 * Edge dan Opera keduanya menyebut `Chrome/` di dalam user agent-nya, dan Chrome menyebut
 * `Safari/`. Kalau `Chrome` diperiksa lebih dulu, Edge dan Opera akan tercatat sebagai Chrome;
 * kalau `Safari` diperiksa lebih dulu, hampir semua peramban akan tercatat sebagai Safari.
 * Akibatnya bukan sekadar label salah — `sidik_profil` dua orang berbeda bisa jadi sama, dan
 * laporan orang kedua ikut tertahan. Itu justru cacat yang K-424-5 lahir untuk menutup.
 *
 * Versi peramban diambil supaya tim Support bisa membedakan gangguan yang hanya muncul di versi
 * tertentu. Untuk Safari versinya ada di `Version/`, bukan di `Safari/` — itu memang bentuknya.
 */
function uraiBrowser(ua: string): string {
  const versi = (pola: RegExp): string => {
    const cocok = ua.match(pola)
    return cocok?.[1] ? ` ${cocok[1]}` : ''
  }

  if (/Edg[A-Z]?\//.test(ua))       return `Edge${versi(/Edg[A-Z]?\/(\d+)/)}`
  if (/OPR\/|Opera/.test(ua))       return `Opera${versi(/(?:OPR|Opera)[/ ](\d+)/)}`
  if (/SamsungBrowser\//.test(ua))  return `Samsung Internet${versi(/SamsungBrowser\/(\d+)/)}`
  if (/Firefox\//.test(ua))         return `Firefox${versi(/Firefox\/(\d+)/)}`
  if (/Chrome\//.test(ua))          return `Chrome${versi(/Chrome\/(\d+)/)}`
  if (/Safari\//.test(ua))          return `Safari${versi(/Version\/(\d+)/)}`

  return TIDAK_DIKENAL
}

// ─── Penguraian perangkat ─────────────────────────────────────────────────────
/**
 * Label ditulis dalam Bahasa Indonesia yang bisa dibaca langsung oleh tim Support —
 * `Ponsel Android`, bukan kode mentah `Android`. Alasannya sama dengan label area di email
 * (S#424): kode mentah tidak berarti apa-apa bagi orang yang menangani keluhannya.
 *
 * Android tanpa penanda `Mobile` adalah tablet — itu memang cara Android membedakan keduanya.
 */
function uraiPerangkat(ua: string): string {
  if (/iPhone/.test(ua))             return 'Ponsel iPhone'
  if (/iPad/.test(ua))               return 'Tablet iPad'
  if (/Android/.test(ua))            return /Mobile/.test(ua) ? 'Ponsel Android' : 'Tablet Android'
  if (/Windows NT/.test(ua))         return 'Desktop Windows'
  if (/Macintosh|Mac OS X/.test(ua)) return 'Desktop macOS'
  if (/CrOS/.test(ua))               return 'Desktop ChromeOS'
  if (/X11|Linux/.test(ua))          return 'Desktop Linux'

  return TIDAK_DIKENAL
}
