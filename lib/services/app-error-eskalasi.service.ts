// lib/services/app-error-eskalasi.service.ts
// KATEGORI: memutuskan dan mengirim email ESKALASI saat satu gangguan menimpa BANYAK ORANG.
//
// Dibuat: Sesi #427 — pecahan dari `app-error.service.ts` (K-427-1).
//
// ═══ KENAPA BERKAS TERPISAH ═══════════════════════════════════════════════════════════════════
// Bukan sekadar karena ukuran. Tanggung jawabnya memang beda, dan itu terlihat dari alasan
// perubahannya di masa depan:
//   · `app-error.service.ts`      berubah kalau cara MENCATAT laporan berubah
//   · `app-error-eskalasi...`(ini) berubah kalau aturan KAPAN TIM HARUS DIPANGGIL berubah
// Sumbu yang sama dipakai di lapisan repository (`app-error.repository` vs
// `app-error-eskalasi.repository`), jadi lapisan service mengikuti bentuk yang sudah ada.
//
// Pemicu langsungnya: `app-error.service.ts` sudah 11.285 B SEBELUM disentuh — melewati batas
// 10 KB untuk berkas kode. K-426-2 mengikat: berkas yang melewati plafon DIPECAH per kategori,
// DILARANG dirampingkan komentarnya. K-427-1 menyerahkan sumbu pemecahannya ke Claude.
//
// ═══ YANG DITUTUP: `TEMUAN-ESKALASI-TIDAK-ADA` (lahir S#424, dijawab K-425-2) ═════════════════
// Sebelum ini: 1 orang melapor → 1 email; 5.000 orang melapor → TETAP 1 email yang sama. Tim
// Support tidak punya cara membedakan keluhan perorangan dari platform yang sedang tumbang.
//
// ═══ ANTI-HARDCODE (ATURAN 8) ════════════════════════════════════════════════════════════════
// NOL angka bisnis di berkas ini. Ambang eskalasi dibaca dari Config Registry. Kalau item-nya
// BELUM ADA, eskalasi TIDAK MENYALA dan itu BERBUNYI di log — bukan diganti angka bawaan diam-diam.
// Email pertama (saat insiden lahir) tetap terkirim, jadi tidak ada laporan yang hilang.

import 'server-only'
import { appErrorRepo_hitungPelaporUnik } from '@/lib/repositories/app-error-eskalasi.repository'
import { getConfigPageItems } from '@/lib/config-registry'
import { getMessage } from '@/lib/message-library'
import { sendResendEmail } from '@/lib/utils/resend.server'
import { getNamaBrandPlatform } from '@/lib/utils/brand.server'
import { TeamContactService_getKontakTujuan } from '@/lib/services/team-contact.service'
import { isiVariabel, buangBarisKosong } from '@/lib/utils/bug-mailto.util'

/** Nama item Config Registry (feature_key `monitoring`) yang memuat ambang bertingkat. */
const KEY_AMBANG = 'error_report_ambang_eskalasi'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface KonteksEskalasi {
  insidenKey:    string
  namaHalaman:   string
  alamatHalaman: string
  labelArea:     string
  tenantId:      string | null
  kodeError:     string
  /** Profil pelapor TERAKHIR — ikut isi email (K-424-5 poin 6). */
  ipPelapor:     string | null
  browser:       string | null
  perangkat:     string | null
}

export interface HasilEskalasi {
  /** `false` = eskalasi tidak dievaluasi sama sekali (ambang belum ada di Config Registry). */
  menyala:         boolean
  jumlahPelapor:   number
  /** Ambang tertinggi yang tertembus; `null` kalau belum ada yang tertembus. */
  ambangTertembus: number | null
  emailTerkirim:   boolean
  alasanGagal:     string | null
}

const NOL_ESKALASI: HasilEskalasi = {
  menyala: false, jumlahPelapor: 0, ambangTertembus: null,
  emailTerkirim: false, alasanGagal: null,
}

// ─── bacaAmbangEskalasi ───────────────────────────────────────────────────────
/**
 * Baca daftar ambang bertingkat dari Config Registry, mis. `5,25,100`.
 *
 * Mengembalikan array KOSONG kalau item-nya belum ada atau isinya tidak terbaca sebagai angka.
 * Array kosong = eskalasi tidak menyala. DILARANG mengganti dengan angka bawaan di kode (ATURAN 8):
 * angka bisnis yang lahir di kode tidak pernah bisa diubah Philips dari Dashboard.
 */
async function bacaAmbangEskalasi(): Promise<number[]> {
  try {
    const rows  = await getConfigPageItems('monitoring')
    const baris = rows.find((r) => r.policy_key === KEY_AMBANG)
    if (!baris?.nilai) return []
    return String(baris.nilai)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b)
  } catch (err) {
    // BUKAN catch kosong (BUG-034 · BUG-038). Config tak terbaca tidak boleh menggagalkan laporan,
    // tetapi WAJIB berbunyi supaya tidak jadi bug senyap.
    console.warn(`[AppErrorEskalasi] gagal membaca ${KEY_AMBANG}, eskalasi dilewati`, err)
    return []
  }
}

// ─── AppErrorEskalasi_periksaDanKirim ─────────────────────────────────────────
/**
 * Periksa apakah gangguan ini sudah menimpa cukup banyak ORANG BERBEDA untuk dieskalasi, lalu
 * kirim emailnya bila ya (K-425-2).
 *
 * Dipanggil HANYA sesudah baris BARU lahir. Laporan yang tertahan (profil sama + halaman sama)
 * tidak menambah jumlah pelapor unik, jadi memanggilnya di sana hanya membuang query.
 *
 * ⚠️ Kegagalan di fungsi ini TIDAK BOLEH menggagalkan pencatatan laporan — audit trail sudah
 * ditulis sebelum ini dipanggil. Semua kegagalan dikembalikan sebagai `alasanGagal`, bukan
 * dilempar ke atas.
 */
export async function AppErrorEskalasi_periksaDanKirim(
  ctx: KonteksEskalasi
): Promise<HasilEskalasi> {
  const ambangList = await bacaAmbangEskalasi()

  if (ambangList.length === 0) {
    // Sengaja BERBUNYI. Ini keadaan "fitur belum dinyalakan", bukan kegagalan — dan Philips harus
    // bisa melihatnya di log tanpa membaca kode.
    console.warn(
      `[AppErrorEskalasi] item config '${KEY_AMBANG}' belum ada/kosong — eskalasi TIDAK menyala. ` +
      `Isi lewat Dashboard SA (feature_key monitoring), bukan lewat SQL (LL#26).`
    )
    return NOL_ESKALASI
  }

  const sebaran = await appErrorRepo_hitungPelaporUnik(ctx.insidenKey)
  const jumlah  = sebaran.jumlahUnik

  // Ambang TERTINGGI yang sudah dilewati — supaya perihal email menyebut skala terbesar,
  // bukan ambang terkecil yang kebetulan tersentuh duluan.
  const tertembus = [...ambangList].reverse().find((a) => jumlah >= a) ?? null

  if (tertembus === null) {
    return { menyala: true, jumlahPelapor: jumlah, ambangTertembus: null,
             emailTerkirim: false, alasanGagal: null }
  }

  try {
    const kontak = await TeamContactService_getKontakTujuan('bug_dashboard')
    if (!kontak?.email) {
      const alasan = 'Belum ada kontak tim yang dicentang untuk laporan bug'
      console.warn('[AppErrorEskalasi] nol kontak bug_dashboard — email eskalasi dilewati')
      return { menyala: true, jumlahPelapor: jumlah, ambangTertembus: tertembus,
               emailTerkirim: false, alasanGagal: alasan }
    }

    const [templatePerihal, templateIsi, brandName] = await Promise.all([
      getMessage('error_email_subject_eskalasi'),
      getMessage('error_email_body'),
      getNamaBrandPlatform(ctx.tenantId),
    ])

    const nilai: Record<string, string> = {
      area:           ctx.labelArea,
      nama_halaman:   ctx.namaHalaman,
      alamat_halaman: ctx.alamatHalaman,
      brand_name:     brandName,
      kode_error:     ctx.kodeError,
      jumlah_pelapor: String(jumlah),
      ambang:         String(tertembus),
      ip_pelapor:     ctx.ipPelapor ?? '',
      browser:        ctx.browser ?? '',
      perangkat:      ctx.perangkat ?? '',
      pengguna:       '',
      waktu:          '',
    }

    // Email eskalasi memakai template isi yang SAMA dengan email pertama, tetapi tidak punya
    // "waktu" dan "pengguna" satu kejadian tunggal — ia merangkum BANYAK pelapor. Baris itu WAJIB
    // DIBUANG, bukan dicetak kosong: baris berlabel tanpa isi terbaca sebagai data yang hilang,
    // dan tim Support akan mengira laporannya rusak.
    const kosong = ['pengguna', 'waktu']
    if (!ctx.ipPelapor) kosong.push('ip_pelapor')
    if (!ctx.browser)   kosong.push('browser')
    if (!ctx.perangkat) kosong.push('perangkat')

    const hasil = await sendResendEmail({
      toEmail:  kontak.email,
      toNama:   kontak.nama,
      subject:  isiVariabel(templatePerihal, nilai),
      textBody: isiVariabel(buangBarisKosong(templateIsi, kosong), nilai),
    })

    if (!hasil.success) console.error('[AppErrorEskalasi] Resend gagal:', hasil.message)

    return {
      menyala: true, jumlahPelapor: jumlah, ambangTertembus: tertembus,
      emailTerkirim: hasil.success,
      alasanGagal: hasil.success ? null : (hasil.message ?? 'Pengiriman email eskalasi gagal'),
    }
  } catch (err) {
    // WAJIB berbunyi — menelannya mengubah fitur anti-bug-senyap jadi bug senyap (BUG-034/038).
    const alasan = err instanceof Error ? err.message : 'Kesalahan tak dikenal saat eskalasi'
    console.error('[AppErrorEskalasi] pengiriman email eskalasi gagal:', err)
    return { menyala: true, jumlahPelapor: jumlah, ambangTertembus: tertembus,
             emailTerkirim: false, alasanGagal: alasan }
  }
}
