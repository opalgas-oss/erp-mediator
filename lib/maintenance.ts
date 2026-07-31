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
import { TeamContactService_getKontakTujuan } from '@/lib/services/team-contact.service'
import { buildBugWaLink }        from '@/lib/utils/wa-link.util'
import { getNamaBrandPlatform }  from '@/lib/utils/brand.server'

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
   */
  teksLapor: {
    tombol:   string
    mengirim: string
    sukses:   string
    gagal:    string
  }
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
  let teksLapor = { tombol: '', mengirim: '', sukses: '', gagal: '' }

  if (on && showContact) {
    // Teks tombol LAPOR dibaca lebih dulu dan TIDAK bergantung pada ada/tidaknya kontak:
    // laporan tetap tercatat ke `app_error_log` walau nol kontak dicentang. Audit trail adalah
    // alasan kanal ini dipilih (K-424) — ia tidak boleh mati hanya karena daftar kontak kosong.
    const [tTombol, tMengirim, tSukses, tGagal] = await Promise.all([
      getMessage('error_report_button'),
      getMessage('error_report_sending'),
      getMessage('error_report_success'),
      getMessage('error_report_failed'),
    ])
    teksLapor = { tombol: tTombol, mengirim: tMengirim, sukses: tSukses, gagal: tGagal }

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
        namaHalaman:   map['maintenance_title'] || 'Sedang Dalam Perbaikan',
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
