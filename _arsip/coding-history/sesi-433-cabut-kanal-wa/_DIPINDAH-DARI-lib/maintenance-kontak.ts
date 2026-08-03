// lib/maintenance-kontak.ts
// Pencari kontak tujuan untuk halaman Maintenance.
// Sumber: `team_contacts` (kontak terpublikasi).
//
// ⛔ S#433 — PEMBANGUN TAUTAN WHATSAPP DIBUANG DARI BERKAS INI (K-432-4 + K-432-7).
//   Philips, VERBATIM S#432: *"kalau ini jadi lama dan proses nya susah, lebih baik [tautan WA]
//   dihapus saja, kita gunakan email saja."* Ditegaskan S#433: *"Semua instruksi saya terkait
//   pengiriman pesan lewat No WA sebelumnya, berarti itu semua di cancel."*
//   ⇒ MENCABUT SEBAGIAN K-424-1. Yang ikut mati bersamanya:
//     · hardcode `alamatHalaman: '/'` (kemunculan KETIGA pola `routePath`/`area`)
//     · pembacaan `message_library`: `error_wa_message` · `maintenance_contact_wa_cta` · `error_area_publik`
//     · pembacaan zona waktu `platform_general.platform_timezone` DI SINI — config-nya TIDAK jadi
//       yatim: konsumen keduanya hidup di `lib/services/app-error-email.service.ts` (jalur EMAIL).
//   `lib/utils/wa-link.util.ts` TIDAK dihapus: `normalkanNomorWaLink()` di dalamnya masih dipakai
//   `team-contact.service.ts` untuk merapikan nomor sebelum disimpan. Hanya `buildBugWaLink()`
//   yang kehilangan pemakai.
//   ⚠️ DILARANG menghidupkan kembali tanpa keputusan Philips yang baru.
//
// Dibuat: Sesi #428 — pemecahan KEDUA `lib/maintenance.ts` (K-427-1 menyerahkan sumbu ke Claude).
//
// KENAPA PEMECAHAN KEDUA — INI PELAJARAN S#427 (TEMUAN-3) YANG DITEGAKKAN, BUKAN DIULANG:
//   Pemecahan pertama (teks Pop Up → `lib/maintenance-teks.ts`) menurunkan induknya ke 9.932 B —
//   masih 97,0% batas 10 KB. Persis pola S#427: pecahan pertama TIDAK cukup, dan refleks
//   berikutnya adalah memangkas komentar. K-426-2 melarang itu. Maka: UKUR ULANG, lalu PECAH LAGI.
//
// Sumbu tetap sama, yaitu ALASAN BERUBAH:
//   `maintenance.ts`        → berubah saat KONFIGURASI halaman berubah
//   `maintenance-teks.ts`   → berubah saat TEKS berubah
//   `maintenance-kontak.ts` → berubah saat KANAL KONTAK berubah (nomor, template, zona waktu)
//
// §6.3 tetap berlaku: nol kontak ⇒ nol tautan. Tidak ada ajakan menghubungi tanpa alamat
// di baliknya — dan satu nomor salah format DILARANG menumbangkan halaman PUBLIK.

import 'server-only'
import { TeamContactService_getKontakTujuan } from '@/lib/services/team-contact.service'

export interface KontakMaintenance {
  /** Alamat email kontak terpublikasi PERTAMA. `null` ⇒ ajakan menghubungi tidak ditampilkan. */
  emailKontak: string | null
}

/**
 * ⛔ PARAMETER `judulHalaman` DIBUANG S#433. Satu-satunya pemakainya adalah isi pesan WhatsApp,
 * dan kanal itu DICABUT (K-432-4 + K-432-7). Membiarkan parameter yang tidak pernah dipakai =
 * kebohongan kecil pada pembaca berikutnya: ia akan mengira judul halaman masih dipakai di sini.
 */
export async function bacaKontakMaintenance(): Promise<KontakMaintenance> {
  const kontak = await TeamContactService_getKontakTujuan('public_page')

  return { emailKontak: kontak?.email ?? null }
}
