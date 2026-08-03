// lib/maintenance.ts
// Server-side reader untuk kondisi & tampilan halaman Maintenance.
// Sumber: config_registry (feature_key='sistem') + message_library (teks pesan).
// Anti-hardcode (K-411-3): semua nilai dari config; NOL hardcode.
//
// Dibuat: Sesi #412 — HUTANG-PAGE-CONFIG-SA page `sistem`, consumer loop-tertutup (ATURAN 34).
// Dipakai oleh gate maintenance di: app/page.tsx (homepage/publik) + app/dashboard/vendor/layout.tsx.
// getConfigPageItems() dipakai (BUKAN getConfigValues) supaya nilai field non-mode tetap terbaca
// walau is_active-nya di-toggle — kecuali maintenance_mode yang justru dipakai sebagai sinyal ON/OFF.

import 'server-only'
import { getConfigPageItems } from '@/lib/config-registry'
import { getMessage }         from '@/lib/message-library'
import { bacaTeksLaporGangguan, TEKS_LAPOR_KOSONG } from '@/lib/maintenance-teks'
import { bacaKontakMaintenance }                    from '@/lib/maintenance-kontak'
import type { TeksLaporGangguan }                   from '@/lib/types/lapor-gangguan.type'

export interface MaintenanceConfig {
  on:           boolean
  title:        string
  body:         string
  illustration: string   // id preset (preset_*) ATAU URL hasil upload (Supabase Storage)
  theme:        string   // terang | brand | senja | mint
  eta:          string
  showContact:  boolean
  // ─── S#423 — menutup DUA teks hardcode di MaintenanceView.tsx ───────────────
  /** Awalan ETA, dari message_library `maintenance_eta_prefix` (dulu hardcode "Perkiraan selesai:") */
  etaPrefix:    string
  /** Teks ajakan, dari message_library `maintenance_contact_cta` (dulu hardcode) */
  ctaText:      string
  /**
   * Alamat tujuan tautan "hubungi tim kami" — kontak terpublikasi PERTAMA
   * (`team_contacts`, `publish_public_page`, urut sort_order).
   *
   * **null = TIDAK ADA alamat → ajakan menghubungi WAJIB tidak ditampilkan** (DESAIN §6.3:
   * "tidak ada ajakan menghubungi tanpa alamat di baliknya"). Dua keadaan menghasilkan null:
   * daftar kontak kosong, ATAU ada kontak tapi nol yang dicentang publikasi publik.
   */
  emailKontak:  string | null
  // ─── S#424 — KANAL LAPORAN: tombol server-send (utama) + WhatsApp (pelengkap) ──────────
  //
  // ⚠️ `mailtoHref` DIHAPUS di S#424 atas koreksi Philips (*"ini mana yang mau di pakai???"*).
  //    Dua alasan, keduanya berdasar bukti:
  //    1. RUSAK — diuji di komputer Philips, jendela normal (bukan Incognito): payload sempurna
  //       (terbukti tab Payload DevTools) tapi Chrome berhenti `0 B transferred`, nol handler
  //       `mailto:` terdaftar. Memajang jalur yang diketahui gagal = menjebak pengunjung.
  //    2. REDUNDAN — tombol lapor sudah mengirim email lewat SERVER, dan hanya jalur itu yang
  //       memenuhi tuntutan audit trail K-424 (server tahu terkirim atau tidak; `mailto:` tidak
  //       pernah tahu).
  //    `buildBugMailto()` di `lib/utils/bug-mailto.util.ts` kini NOL pemakai — dicatat sebagai
  //    HUTANG-BUGMAILTO-YATIM, bukan dihapus diam-diam di sesi yang sama (anti-overreach).
  /**
   * Tautan `https://wa.me/...` **LENGKAP** — sudah memuat pesan terisi otomatis.
   *
   * K-424-1 (Philips): WA = kanal KIRIM, email = kanal DOKUMENTASI & LOG. Keduanya berdampingan.
   * Kelebihan WA atas `mailto:`: `wa.me` jalan di aplikasi ponsel, WhatsApp Desktop, DAN WhatsApp
   * Web — tidak bergantung aplikasi email terpasang, jadi tidak bisa gagal senyap seperti
   * `mailto:` di jendela Incognito (bukti T-424-4).
   *
   * `null` = nomor tujuan kosong / tidak layak ⇒ tautan WA WAJIB tidak dirender (pola §6.3).
   */
  waHref:       string | null
  /** Label tautan WA, dari message_library `maintenance_contact_wa_cta` */
  waCtaText:    string
  /**
   * Teks tombol LAPOR (aksi utama) — semuanya dari `message_library` kategori `error_ui`.
   *
   * Dioper PROP ke Client Component `LaporGangguanButton` karena `getMessage()` ber-`server-only`
   * (pola K-420-4, sama seperti nama brand).
   *
   * K-424 (Philips): support problem WAJIB lewat email demi **audit trail + log history**, supaya
   * penyelesaian case tidak jadi subjektif karena kedekatan personal. Tombol ini jalur resminya:
   * server mencatat ke `app_error_log` lalu mengirim email — tidak menitipkan ke aplikasi email
   * pengguna seperti `mailto:` (yang terbukti gagal senyap tanpa handler).
   *
   * ⚠️ S#428 — bagian D K-424-5: BENTUKNYA BERUBAH. Empat medan datar diganti satu objek yang
   * juga memuat enam teks Pop Up (`popUp`). Pembacanya pindah ke `lib/maintenance-teks.ts`
   * karena berkas ini sudah 9.615 B = 96,2% batas 10 KB SEBELUM disentuh; menambah enam
   * pembacaan di sini pasti melewatinya, dan K-426-2 melarang jalan pintas "rampingkan
   * komentarnya" — yang benar adalah MEMECAH.
   */
  teksLapor: TeksLaporGangguan
}

// Baca semua field sistem → bentuk MaintenanceConfig.
// maintenance_mode = sinyal ON/OFF (toggle set nilai+is_active bersamaan).
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const rows = await getConfigPageItems('sistem')

  const map: Record<string, string> = {}
  for (const r of rows) {
    if (r.policy_key) map[r.policy_key] = r.nilai
  }

  const on          = map['maintenance_mode']         === 'true'
  const showContact = map['maintenance_show_contact'] === 'true'

  // Pesan: config menyimpan KEY message_library (keputusan Philips S#412), teks diedit di menu Pesan.
  const messageKey = map['maintenance_message'] || 'maintenance_body'

  // Ketiga teks dibaca paralel — nol tambahan latency dibanding sebelumnya.
  // Nilai fallback = teks lama PERSIS (pola S#363: zero behavior change kalau key belum ada).
  const [body, etaPrefix, ctaText] = await Promise.all([
    getMessage(messageKey, 'Mohon maaf, situs sedang dalam perbaikan. Kami akan segera kembali.'),
    getMessage('maintenance_eta_prefix',  'Perkiraan selesai:'),
    getMessage('maintenance_contact_cta', 'Butuh bantuan? Silakan hubungi tim kami.'),
  ])

  // §6.3 — alamat tujuan HANYA dicari kalau memang akan dipakai. Saat maintenance mati
  // atau toggle kontak mati, nol query tambahan ke team_contacts.
  let emailKontak: string | null = null
  let waHref:      string | null = null
  let waCtaText                  = ''
  let teksLapor: TeksLaporGangguan = TEKS_LAPOR_KOSONG

  if (on && showContact) {
    // Teks tombol LAPOR dibaca lebih dulu dan TIDAK bergantung pada ada/tidaknya kontak:
    // laporan tetap tercatat ke `app_error_log` walau nol kontak dicentang. Audit trail adalah
    // alasan kanal ini dipilih (K-424) — ia tidak boleh mati hanya karena daftar kontak kosong.
    // Sembilan teks (3 tombol + 6 Pop Up) dibaca sekali jalan di `lib/maintenance-teks.ts`.
    teksLapor = await bacaTeksLaporGangguan()

    // Kontak tujuan + tautan WhatsApp DIPINDAH ke `lib/maintenance-kontak.ts` (S#428, pemecahan
    // KEDUA — pecahan pertama menyisakan berkas ini di 97,0% batas 10 KB, dan TEMUAN-3 S#427
    // mewajibkan ukur ulang lalu pecah lagi, bukan memangkas komentar).
    //
    // Judul halaman DIOPER dari sini, bukan dibaca ulang dari config di sana: satu pembacaan
    // config, satu sumber kebenaran (ATURAN 36).
    const kontak = await bacaKontakMaintenance(
      map['maintenance_title'] || 'Sedang Dalam Perbaikan'
    )
    emailKontak = kontak.emailKontak
    waHref      = kontak.waHref
    waCtaText   = kontak.waCtaText
  }

  return {
    on,
    title:        map['maintenance_title']        || 'Sedang Dalam Perbaikan',
    body,
    illustration: map['maintenance_illustration'] || 'preset_wrench',
    theme:        map['maintenance_theme']        || 'terang',
    eta:          map['maintenance_eta']          || '',
    showContact,
    etaPrefix,
    ctaText,
    emailKontak,
    waHref,
    waCtaText,
    teksLapor,
  }
}
