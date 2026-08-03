// lib/maintenance-kontak.ts
// Pencari kontak tujuan + pembangun tautan WhatsApp untuk halaman Maintenance.
// Sumber: `team_contacts` (kontak terpublikasi) + `message_library` + `config_registry`.
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
import { getConfigPageItems } from '@/lib/config-registry'
import { getMessage }         from '@/lib/message-library'
import { TeamContactService_getKontakTujuan } from '@/lib/services/team-contact.service'
import { buildBugWaLink }        from '@/lib/utils/wa-link.util'
import { getNamaBrandPlatform }  from '@/lib/utils/brand.server'

export interface KontakMaintenance {
  /** Alamat email kontak terpublikasi PERTAMA. `null` ⇒ ajakan menghubungi tidak ditampilkan. */
  emailKontak: string | null
  /** Tautan `https://wa.me/...` lengkap dengan pesan terisi. `null` ⇒ tautan WA tidak dirender. */
  waHref:      string | null
  /** Label tautan WA dari `message_library` `maintenance_contact_wa_cta`. */
  waCtaText:   string
}

/**
 * @param judulHalaman Judul halaman maintenance yang sedang tampil — ikut masuk isi pesan WA
 *   supaya tim Support tahu halaman mana yang dilaporkan. Dioper dari pemanggil, BUKAN dibaca
 *   ulang dari config di sini: satu pembacaan config, satu sumber kebenaran (ATURAN 36).
 */
export async function bacaKontakMaintenance(
  judulHalaman: string
): Promise<KontakMaintenance> {
  let emailKontak: string | null = null
  let waHref:      string | null = null
  let waCtaText                  = ''

  const kontak = await TeamContactService_getKontakTujuan('public_page')
  emailKontak  = kontak?.email ?? null

  if (kontak) {
    // Bahan tautan dibaca paralel. SENGAJA tanpa nilai fallback untuk ketiga template:
    // ketiganya baris NYATA di message_library (2 di antaranya di-INSERT S#424). Kalau salah
    // satu hilang, getMessage() mengembalikan NAMA KEY-nya sehingga kerusakan LANGSUNG TERLIHAT
    // di email/pesan — gagal berisik jauh lebih baik daripada gagal senyap untuk fitur yang
    // seluruh tujuannya adalah melaporkan kerusakan.
    const [templatePesanWa, ctaWa, brandName, rowsUmum, labelArea] =
      await Promise.all([
        getMessage('error_wa_message'),
        getMessage('maintenance_contact_wa_cta'),
        getNamaBrandPlatform(null),
        getConfigPageItems('platform_general'),
        getMessage('error_area_publik'),
      ])

    waCtaText = ctaWa

    // Zona waktu dari config_registry `platform_general.platform_timezone` — NOL hardcode
    // (ATURAN 8). Nilai live: 'Asia/Jakarta'. Fallback hanya jaring terakhir kalau barisnya
    // dihapus; memakainya di sini sekaligus MENUTUP loop config yang sebelumnya menganggur
    // tanpa konsumen (ATURAN 34).
    const zona =
      rowsUmum.find((r) => r.policy_key === 'platform_timezone')?.nilai || 'Asia/Jakarta'

    const waktu = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone:  zona,
    }).format(new Date())

    // Bahan yang sama dipakai kedua kanal supaya isi email dan isi WA tidak bisa berbeda.
    // `pengguna` + `kodeError` sengaja null: halaman maintenance BUKAN halaman error — di sini
    // tidak ada `error.digest` dan tidak ada sesi pengguna. Kedua baris itu DIHAPUS otomatis
    // oleh buangBarisKosong() sesuai §8. Bug Code muncul di halaman error (FASE 3.6e).
    const bahan = {
      area:          labelArea,
      namaHalaman:   judulHalaman,
      alamatHalaman: '/',
      waktu,
      brandName,
      pengguna:      null,
      kodeError:     null,
    }

    // buildBugWaLink mengembalikan null sendiri kalau nomornya kosong / tidak layak —
    // tidak melempar, karena ini halaman PUBLIK dan satu nomor salah format DILARANG
    // menumbangkan halaman.
    waHref = buildBugWaLink({
      nomorTujuan:   kontak.telepon ?? '',
      templatePesan: templatePesanWa,
      ...bahan,
    })
  }

  return { emailKontak, waHref, waCtaText }
}
