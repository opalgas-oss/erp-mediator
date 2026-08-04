// components/maintenance/MaintenanceGate.tsx
// KOMPONEN BERSAMA gerbang maintenance — satu logika, lima tempat pasang (§4 A2).
//
// Dibuat: Sesi #435 — FASE 3.6e sub-fitur A. Acuan:
//   ..._GERBANG_MAINTENANCE.md §4 A1 (matriks permukaan) + A2 (tiga lapis anti-lockout).
//
// KENAPA KOMPONEN, BUKAN BLOK YANG DISALIN:
//   Sebelum sesi ini gerbangnya hidup di DUA tempat (`app/page.tsx` + `app/dashboard/vendor/layout.tsx`)
//   sebagai blok tiga baris yang identik — `getMaintenanceConfig()` lalu `if (on) return <MaintenanceView>`.
//   Menambah tiga permukaan lagi dengan cara yang sama berarti lima salinan satu keputusan, dan
//   keputusan itu adalah keputusan yang KALAU SALAH mengunci Philips di luar platformnya sendiri.
//   Itu bug arsitektur menurut ATURAN 19, bukan sekadar tidak rapi. Koreksi 1.4.1 desain menyebutnya
//   eksplisit: "Dipasang di 5 tempat, logikanya ditulis sekali."
//
// SERVER COMPONENT MURNI. `import 'server-only'` sengaja dipasang: `getMaintenanceConfig()` membaca
// `config_registry` + `message_library` dan TIDAK BOLEH ikut terbawa ke bundel klien. Kalau sesi
// berikutnya keliru mengimpor berkas ini dari Client Component, paket itu MELEMPAR saat build —
// gagal berisik di meja developer, bukan gagal senyap di halaman pengunjung.
//
// ⛔ DILARANG DIPASANG DI: `app/dashboard/superadmin/layout.tsx` dan seluruh pohon pintu masuk
//    (`app/sa/`, `app/at/`, `app/login/`, `app/forgot-password/`, `app/reset-password/`,
//    `app/aktivasi/`, `app/auth/`, `app/init-philipsliemena/`). Larangan ini BUKAN sekadar komentar —
//    ia ditegakkan guard build-time Lapis 2 (`lib/guards/maintenance-lockout.guard.test.ts`),
//    karena komentar bisa dilewati sesi berikutnya sedangkan build yang gagal tidak bisa.

import 'server-only'
import type { ReactNode } from 'react'

import { getMaintenanceConfig }  from '@/lib/maintenance'
import type { MaintenanceConfig } from '@/lib/maintenance'
import { MaintenanceView }       from '@/components/maintenance/MaintenanceView'
import { AREA_DIBLOK }           from '@/lib/constants/maintenance.constant'
import type { AreaGerbang }      from '@/lib/constants/maintenance.constant'

/**
 * KEPUTUSAN gerbang — SATU-SATUNYA tempat pertanyaan "permukaan ini sedang diblok atau tidak?"
 * dijawab. Mengembalikan config bila halaman maintenance HARUS tampil, `null` bila halaman biasa
 * boleh diteruskan.
 *
 * KENAPA FUNGSI INI ADA, padahal sudah ada komponennya (keputusan teknis Claude S#435):
 *   Bentuk pembungkus `<MaintenanceGate>` hanya bisa memutuskan SESUDAH seluruh badan layout
 *   berjalan — termasuk `redirect()` yang dipanggil secara imperatif sebelum ada JSX. Di
 *   `app/dashboard/vendor/layout.tsx` gerbang maintenance hari ini berdiri SEBELUM pemeriksaan
 *   status vendor; membungkusnya di JSX akan memindahkannya ke paling akhir, sehingga vendor yang
 *   statusnya belum disetujui dialihkan ke `/login` alih-alih melihat halaman maintenance —
 *   bertentangan dengan §4 A1 yang menyatakan Dashboard Vendor DIBLOK. Ia juga membuat empat
 *   query berjalan sia-sia setiap halaman maintenance tampil.
 *
 *   Menyediakan dua jalan yang berbeda ISINYA = dua sumber kebenaran, penyakit yang gerbang ini
 *   ada untuk menyembuhkan. Karena itu keputusannya hidup di SINI, dan komponen di bawah hanyalah
 *   bungkus tipis di atasnya. Halaman memakai komponen; layout yang ber-`redirect` memakai fungsi.
 *   Keduanya menanyai kode yang sama.
 */
export async function gerbangMaintenance(area: AreaGerbang): Promise<MaintenanceConfig | null> {
  // Lapis 1 — daftar area ada di KODE, bukan config (pengecualian sadar ATURAN 8; alasan lengkap
  // di `lib/constants/maintenance.constant.ts`). Permukaan exempt keluar di sini, NOL query.
  if (!AREA_DIBLOK.includes(area)) return null

  const data = await getMaintenanceConfig()

  // `maintenance_mode` mati ⇒ halaman biasa diteruskan.
  return data.on ? data : null
}

interface MaintenanceGateProps {
  /**
   * Permukaan yang sedang dibungkus. Menentukan DUA hal sekaligus:
   *   1. apakah permukaan ini termasuk yang diblok (`AREA_DIBLOK`), dan
   *   2. nilai kolom `area` pada baris `app_error_log` bila pengunjung menekan tombol lapor
   *      di halaman maintenance yang tampil.
   *
   * Poin 2 itulah yang menutup `TEMUAN-429-AREA-HARDCODE` (#64): sebelum sesi ini
   * `MaintenanceView` mengirim `area="publik"` HARFIAH, sehingga laporan dari Dashboard Vendor
   * dan AT pun tercatat sebagai `publik` — padahal kolom itu NOT NULL dan dipakai memilah.
   */
  area:     AreaGerbang
  children: ReactNode
}

/**
 * Bungkus permukaan platform dengan gerbang maintenance.
 *
 * ```tsx
 * <MaintenanceGate area="vendor">{children}</MaintenanceGate>
 * ```
 *
 * Urutan pemeriksaan SENGAJA: area diperiksa LEBIH DULU, baru config dibaca. Permukaan yang
 * memang tidak pernah diblok (mis. `super_admin`) tidak menimbulkan satu pun query Supabase —
 * gerbang ini tidak boleh menambah beban ke halaman yang tidak digerbanginya.
 */
export async function MaintenanceGate({ area, children }: MaintenanceGateProps) {
  // Keputusannya BUKAN di sini — komponen ini bungkus tipis di atas `gerbangMaintenance()`.
  // A3 (K-417-5, DITUNDA): saat saklar per-area diaktifkan nanti, yang berubah HANYA sumber daftar
  // area — dari `AREA_DIBLOK` menjadi item config `sistem.maintenance_scope`. Tanda tangan
  // komponen ini sudah menerima `area`, jadi pengaktifannya tidak membongkar satu pun pemanggil.
  const data = await gerbangMaintenance(area)

  if (!data) return <>{children}</>

  return <MaintenanceView data={data} area={area} />
}
