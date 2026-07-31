// lib/services/app-error-email.service.ts
// KATEGORI: MENYUSUN dan MENGIRIM email laporan gangguan PERTAMA (saat insiden lahir).
//
// Dibuat: Sesi #427 — pecahan ketiga dari `app-error.service.ts` (K-427-1).
//
// ═══ KENAPA BERKAS TERPISAH ═══════════════════════════════════════════════════════════════════
// Setelah eskalasi dipisah, `app-error.service.ts` masih 11.284 B — tetap melewati batas 10 KB
// untuk berkas kode. K-426-2 mengikat: yang dilakukan adalah MEMECAH LAGI, bukan memangkas
// komentar supaya muat. Sumbunya tetap sama, yaitu tanggung jawab:
//   · `app-error.service.ts`        alur: bentuk profil → catat → panggil email → panggil eskalasi
//   · `app-error-email...`  (ini)   menyusun isi pesan + mengirimnya
//   · `app-error-eskalasi.service`  memutuskan KAPAN tim dipanggil
// Alasan perubahannya juga beda: berkas ini berubah kalau BENTUK PESAN berubah (teks, variabel,
// zona waktu), bukan kalau alur pencatatan berubah.
//
// ═══ ANTI-HARDCODE (ATURAN 8) ════════════════════════════════════════════════════════════════
// NOL teks pesan di berkas ini. Perihal dan isi datang dari `message_library`; zona waktu dari
// Config Registry `platform_general.platform_timezone`. Yang disisipkan kode hanya NILAI variabel.

import 'server-only'
import { getConfigPageItems } from '@/lib/config-registry'
import { getMessage }         from '@/lib/message-library'
import { sendResendEmail }    from '@/lib/utils/resend.server'
import { getNamaBrandPlatform } from '@/lib/utils/brand.server'
import { TeamContactService_getKontakTujuan } from '@/lib/services/team-contact.service'
import { isiVariabel, buangBarisKosong } from '@/lib/utils/bug-mailto.util'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface KonteksEmailLaporan {
  area:          string
  namaHalaman:   string
  alamatHalaman: string
  kodeError:     string
  uid:           string | null
  tenantId:      string | null
  /** Profil pelapor — WAJIB ikut isi email (K-424-5 poin 6). */
  ipPelapor:     string | null
  browser:       string | null
  perangkat:     string | null
}

export interface HasilEmailLaporan {
  terkirim:    boolean
  alasanGagal: string | null
  /**
   * Label area dalam bahasa manusia, hasil `message_library`. Dikembalikan supaya pemanggil bisa
   * memakai ulang teks yang SAMA untuk email eskalasi — dua email tentang satu gangguan tidak
   * boleh menyebut areanya dengan dua sebutan berbeda.
   */
  labelArea:   string
}

// ─── AppErrorEmail_kirimLaporanPertama ────────────────────────────────────────
/**
 * Susun dan kirim email laporan gangguan pertama ke kontak tim yang dicentang
 * `publish_bug_dashboard`.
 *
 * ⚠️ Fungsi ini TIDAK melempar galat ke atas. Laporan sudah tercatat di audit trail sebelum ini
 * dipanggil; kegagalan email tidak boleh membatalkan pencatatan. Semua kegagalan dikembalikan
 * lewat `alasanGagal` — dan SELALU berbunyi di log (BUG-034 · BUG-038: nol `catch` kosong).
 */
export async function AppErrorEmail_kirimLaporanPertama(
  ctx: KonteksEmailLaporan
): Promise<HasilEmailLaporan> {
  let labelArea = ctx.area

  try {
    const kontak = await TeamContactService_getKontakTujuan('bug_dashboard')

    if (!kontak?.email) {
      // §6.3 — tidak ada alamat tujuan. Bukan galat sistem; laporannya sudah tercatat.
      console.warn('[AppErrorEmail] nol kontak bug_dashboard — email dilewati, laporan tercatat')
      return {
        terkirim: false,
        alasanGagal: 'Belum ada kontak tim yang dicentang untuk laporan bug',
        labelArea,
      }
    }

    const [templatePerihal, templateIsi, brandName, rowsUmum, teksArea] = await Promise.all([
      getMessage('error_email_subject'),
      getMessage('error_email_body'),
      getNamaBrandPlatform(ctx.tenantId),
      getConfigPageItems('platform_general'),
      // Label area dari message_library, bukan kode mentah seperti 'super_admin' yang tidak
      // berarti apa-apa bagi tim Support.
      getMessage(`error_area_${ctx.area}`),
    ])
    labelArea = teksArea

    const zona =
      rowsUmum.find((r) => r.policy_key === 'platform_timezone')?.nilai || 'Asia/Jakarta'

    const waktu = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long', timeStyle: 'short', timeZone: zona,
    }).format(new Date())

    // Baris yang nilainya kosong DIHAPUS dari isi email, bukan ditulis "kosong".
    const kosong: string[] = []
    if (!ctx.uid)       kosong.push('pengguna')
    if (!ctx.ipPelapor) kosong.push('ip_pelapor')
    if (!ctx.browser)   kosong.push('browser')
    if (!ctx.perangkat) kosong.push('perangkat')

    const nilai: Record<string, string> = {
      area:           teksArea,
      nama_halaman:   ctx.namaHalaman,
      alamat_halaman: ctx.alamatHalaman,
      waktu,
      brand_name:     brandName,
      pengguna:       ctx.uid ?? '',
      kode_error:     ctx.kodeError,
      ip_pelapor:     ctx.ipPelapor ?? '',
      browser:        ctx.browser ?? '',
      perangkat:      ctx.perangkat ?? '',
      jumlah_pelapor: '',
      ambang:         '',
    }

    const hasil = await sendResendEmail({
      toEmail:  kontak.email,
      toNama:   kontak.nama,
      subject:  isiVariabel(templatePerihal, nilai),
      textBody: isiVariabel(buangBarisKosong(templateIsi, kosong), nilai),
    })

    if (!hasil.success) console.error('[AppErrorEmail] Resend gagal:', hasil.message)

    return {
      terkirim: hasil.success,
      alasanGagal: hasil.success ? null : (hasil.message ?? 'Pengiriman email gagal'),
      labelArea,
    }
  } catch (err) {
    const alasan = err instanceof Error ? err.message : 'Kesalahan tak dikenal saat mengirim email'
    console.error('[AppErrorEmail] pengiriman email gangguan gagal:', err)
    return { terkirim: false, alasanGagal: alasan, labelArea }
  }
}
