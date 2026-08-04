// lib/maintenance-klien.ts
// Pembaca SISI-KLIEN untuk kondisi & tampilan halaman Maintenance.
// Kembarannya di server: `lib/maintenance.ts` (`getMaintenanceConfig()`).
//
// Dibuat: Sesi #438 — bagian B halaman error (K-436-1).
//
// KENAPA BERKAS INI HARUS ADA (batas Next.js, bukan selera):
//   `app/error.tsx` WAJIB Client Component, sedangkan `lib/maintenance.ts` ber-`server-only`.
//   Halaman error karena itu MUSTAHIL memanggil `getMaintenanceConfig()` — impornya saja sudah
//   mematahkan build. Berkas ini menyusun bentuk `MaintenanceConfig` yang SAMA dari dua endpoint
//   yang SUDAH PUBLIK, jadi NOL route baru dibuat (T-436-4, diverifikasi ulang S#438 dari kode):
//     · GET /api/config/sistem              — auth-nya dihapus S#039, tertulis di kepala route
//     · GET /api/message-library?kategori=  — publik, dipakai halaman login sebelum user masuk
//
// ⚠️ `import type` DI BAWAH SENGAJA TYPE-ONLY. `@/lib/maintenance` memuat `import 'server-only'`;
//    impor NILAI dari sana akan menariknya ke bundel klien dan build GAGAL. `import type` dihapus
//    kompilator sebelum bundling, jadi tipenya dipakai tanpa satu byte pun ikut. Ini juga alasan
//    `TEKS_LAPOR_KOSONG` (nilai, di `lib/maintenance-teks.ts` yang ber-`server-only`) TIDAK diimpor
//    — bentuk kosongnya dirakit dari peta teks yang sama, bukan disalin sebagai konstanta kedua.

import type { MaintenanceConfig }   from '@/lib/maintenance'
import type { TeksLaporGangguan }   from '@/lib/types/lapor-gangguan.type'

/** Kategori teks yang ditarik sekali jalan: isi halaman (`page_ui`) + teks halaman gagal (`error_ui`). */
const KATEGORI_TEKS = 'page_ui,error_ui'

/** Batas tunggu tiap permintaan. Halaman error tidak boleh ikut menggantung saat Supabase lambat. */
const BATAS_MS = 4000

/**
 * Teks cadangan DI DALAM KODE — pengecualian sadar terhadap ATURAN 8, ditetapkan §5.0.6.
 * Dipakai HANYA bila isi dari panel SA gagal dibaca. Alasannya: jaring terakhir tidak boleh punya
 * tali ke sesuatu yang mungkin sudah putus — kalau yang rusak justru sambungan ke Supabase, membaca
 * judulnya pun gagal dan pengguna kembali melihat layar mesin, persis yang mau dihindari.
 */
export const MAINTENANCE_CADANGAN = {
  title:      'Sedang Dalam Perbaikan',
  body:       'Mohon maaf, halaman ini sedang kami perbaiki. Silakan coba beberapa saat lagi.',
  theme:      'terang',
  illustration: 'preset_wrench',
  etaPrefix:  'Perkiraan selesai:',
} as const

const TEKS_LAPOR_KOSONG_KLIEN: TeksLaporGangguan = {
  tombol: '', mengirim: '', gagal: '',
  popUp: {
    judulTerkirim: '', isiTerkirim: '', judulDitahan: '',
    isiDitahan: '', labelKode: '', tombolTutup: '',
  },
}

/** Ambil JSON dengan batas waktu. Gagal apa pun ⇒ `null`, TIDAK melempar. */
async function ambilJson(url: string): Promise<Record<string, unknown> | null> {
  const pembatal = new AbortController()
  const jam = setTimeout(() => pembatal.abort(), BATAS_MS)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: pembatal.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(jam)
  }
}

/** Ratakan respons `/api/config/sistem` (dikelompokkan per kategori) jadi peta policy_key → nilai. */
function petaConfig(json: Record<string, unknown> | null): Record<string, string> {
  const peta: Record<string, string> = {}
  const grup = (json?.data ?? []) as Array<{ items?: Array<{ policy_key?: string; nilai?: string }> }>
  if (!Array.isArray(grup)) return peta
  for (const g of grup) {
    for (const item of g.items ?? []) {
      if (item.policy_key) peta[item.policy_key] = String(item.nilai ?? '')
    }
  }
  return peta
}

/**
 * Susun `MaintenanceConfig` dari sisi klien.
 *
 * ⛔ POSISI SAKLAR DIBACA EKSPLISIT, DAN KETIADAAN BARIS BERARTI **AKTIF**.
 * Keputusan teknis Claude, disodorkan terbuka (ATURAN 13 + 52.6), dasarnya dua-duanya bukti:
 *   1. `GET /api/config/[feature_key]` MEMANG menyaring `is_active = true` (baris 57 route-nya,
 *      dibaca S#438). Tetapi itu TIDAK menyembunyikan posisi saklar: T-437-3 membuktikan `nilai`
 *      dan `is_active` adalah dua kendali TERPISAH di ConfigPageClient, sehingga mematikan saklar
 *      hanya menulis `nilai='false'` — barisnya TETAP lolos filter dan posisinya terbaca apa adanya.
 *   2. Baris itu baru benar-benar hilang kalau SA mematikan `is_active`-nya, atau kalau Supabase
 *      tak terjangkau. Untuk KEDUA keadaan itu wajahnya WAJIB ramah, bukan error mesin: bawaan
 *      `maintenance_mode` adalah AKTIF (K-436-2), dan §5.0.6 melarang jaring terakhir gagal ke arah
 *      yang justru memperlihatkan layar mesin ke pengguna asli.
 * ⇒ HANYA `nilai='false'` yang eksplisit mematikan wajah ramah. Selebihnya AKTIF.
 */
export async function bacaMaintenanceConfigKlien(): Promise<MaintenanceConfig> {
  const [jsonConfig, jsonTeks] = await Promise.all([
    ambilJson('/api/config/sistem'),
    ambilJson(`/api/message-library?kategori=${KATEGORI_TEKS}`),
  ])

  const map  = petaConfig(jsonConfig)
  const teks = ((jsonTeks?.data ?? {}) as Record<string, string>) || {}

  const on          = map['maintenance_mode'] !== 'false'
  const showContact = map['maintenance_show_contact'] === 'true'

  // Config menyimpan KEY message_library, bukan teksnya (keputusan Philips S#412). Endpoint teks
  // publik hanya menerima `?kategori=`, tidak per-key — jadi kategorinya ditarik sekali lalu key-nya
  // dicari di peta hasil. Nol permintaan tambahan, nol route baru.
  const kunciPesan = map['maintenance_message'] || 'maintenance_body'

  // Kesembilan teks tombol/Pop Up ada di kategori `error_ui` yang SUDAH ikut tertarik di atas ⇒
  // dirakit di sini tanpa query kedua. Kosong saat bloknya memang tidak dirender — bukan teks
  // karangan kode (alasan sama dengan `TEKS_LAPOR_KOSONG` di sisi server).
  const teksLapor: TeksLaporGangguan = (on && showContact)
    ? {
        tombol:   teks['error_report_button']   ?? '',
        mengirim: teks['error_report_sending']  ?? '',
        gagal:    teks['error_report_failed']   ?? '',
        popUp: {
          judulTerkirim: teks['error_report_popup_title_sent']    ?? '',
          isiTerkirim:   teks['error_report_success']             ?? '',
          judulDitahan:  teks['error_report_popup_title_waiting'] ?? '',
          isiDitahan:    teks['error_report_already_sent']        ?? '',
          labelKode:     teks['error_report_kode_label']          ?? '',
          tombolTutup:   teks['error_report_close_button']        ?? '',
        },
      }
    : TEKS_LAPOR_KOSONG_KLIEN

  return {
    on,
    title:        map['maintenance_title']        || MAINTENANCE_CADANGAN.title,
    body:         teks[kunciPesan]                || MAINTENANCE_CADANGAN.body,
    illustration: map['maintenance_illustration'] || MAINTENANCE_CADANGAN.illustration,
    theme:        map['maintenance_theme']        || MAINTENANCE_CADANGAN.theme,
    eta:          map['maintenance_eta']          || '',
    showContact,
    etaPrefix:    teks['maintenance_eta_prefix']  || MAINTENANCE_CADANGAN.etaPrefix,
    teksLapor,
  }
}
