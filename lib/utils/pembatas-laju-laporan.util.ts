// lib/utils/pembatas-laju-laporan.util.ts
// KATEGORI: pembatas laju per-IP untuk endpoint laporan gangguan yang SENGAJA publik.
//
// Dibuat: Sesi #427 — menutup `HUTANG-RATELIMIT-ERROR-REPORT` (K-426-1 bagian B).
//
// ═══ KENAPA BERKAS TERPISAH, BUKAN DITARUH DI ROUTE ══════════════════════════════════════════
// Route adalah lapisan tipis: baca permintaan → panggil service → susun respons. Menaruh logika
// pembatas laju di sana membuat route punya dua alasan berubah. Berkas ini juga dipakai ulang
// saat halaman error dashboard lahir (LANGKAH 2 H) — endpoint yang sama, penyerang yang sama.
//
// ═══ GAGAL-TERBUKA, BUKAN GAGAL-TERTUTUP ═════════════════════════════════════════════════════
// Kalau Redis mati / env kosong / kuota habis, laporan TETAP DIPROSES dan kegagalannya dicatat
// berisik. Alasannya bukan kelonggaran: ini fitur ANTI-BUG-SENYAP. Membuat Redis jadi titik
// tunggal yang bisa MEMBUNGKAM pelaporan gangguan justru menciptakan bug senyap kelas BUG-034 —
// tepat kelas masalah yang fitur ini dibangun untuk mencegah.
//
// ═══ ANTI-HARDCODE (ATURAN 8) ════════════════════════════════════════════════════════════════
// NOL angka di berkas ini. Batas jumlah dan lebar jendela dibaca dari Config Registry
// (feature_key `monitoring`). Kalau item-nya BELUM ADA → pembatas TIDAK MENYALA dan itu BERBUNYI
// di log. DILARANG menaruh angka bawaan: nilai yang lahir di kode tidak pernah bisa Philips ubah
// dari Dashboard, dan itu persis pelanggaran yang ATURAN 8 larang.

import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { getRedisClient } from '@/lib/redis'
import { getConfigPageItems } from '@/lib/config-registry'

/** Item Config Registry (feature_key `monitoring`) yang mengatur pembatas ini. */
const KEY_JUMLAH = 'error_report_ratelimit_jumlah'
const KEY_DETIK  = 'error_report_ratelimit_detik'

export interface HasilPembatas {
  /** `true` = permintaan boleh lanjut. GAGAL-TERBUKA: bernilai `true` juga saat pembatas mati. */
  boleh:    boolean
  /** `false` = pembatas tidak aktif (Redis mati / config belum ada) — bukan berarti aman. */
  aktif:    boolean
  /** Sisa jatah pada jendela berjalan; `null` kalau pembatas tidak aktif. */
  sisa:     number | null
}

const TIDAK_AKTIF: HasilPembatas = { boleh: true, aktif: false, sisa: null }

let _pembatas: Ratelimit | null = null
let _sudahCoba = false

async function bacaAturan(): Promise<{ jumlah: number; detik: number } | null> {
  try {
    const rows   = await getConfigPageItems('monitoring')
    const jumlah = Number(rows.find((r) => r.policy_key === KEY_JUMLAH)?.nilai)
    const detik  = Number(rows.find((r) => r.policy_key === KEY_DETIK)?.nilai)
    if (!Number.isFinite(jumlah) || jumlah <= 0) return null
    if (!Number.isFinite(detik)  || detik  <= 0) return null
    return { jumlah, detik }
  } catch (err) {
    console.warn('[pembatas-laju] gagal membaca config pembatas laju — pembatas dilewati', err)
    return null
  }
}

// ─── periksaLajuLaporan ───────────────────────────────────────────────────────
/**
 * Periksa apakah satu alamat IP masih boleh mengirim laporan.
 *
 * @param ip - alamat IP pelapor dari `bacaIpPelapor()`. `null` (IP tidak terbaca) ⇒ pembatas
 *             dilewati; menolak permintaan yang IP-nya tidak terbaca akan membungkam pelapor
 *             yang sah di belakang proksi yang tidak mengirim header.
 */
export async function periksaLajuLaporan(ip: string | null): Promise<HasilPembatas> {
  if (!ip) return TIDAK_AKTIF

  try {
    if (!_sudahCoba) {
      _sudahCoba = true
      const redis  = await getRedisClient()
      const aturan = await bacaAturan()

      if (!redis) {
        console.error('[pembatas-laju] Redis tidak tersedia — pembatas laju TIDAK menyala')
      } else if (!aturan) {
        console.warn(
          `[pembatas-laju] item config '${KEY_JUMLAH}'/'${KEY_DETIK}' belum ada — pembatas TIDAK ` +
          `menyala. Isi lewat Dashboard SA (feature_key monitoring), bukan lewat SQL (LL#26).`
        )
      } else {
        _pembatas = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(aturan.jumlah, `${aturan.detik} s`),
          prefix:  'ratelimit:error-report',
        })
      }
    }

    if (!_pembatas) return TIDAK_AKTIF

    const { success, remaining } = await _pembatas.limit(ip)
    return { boleh: success, aktif: true, sisa: remaining }
  } catch (err) {
    // GAGAL-TERBUKA. Berisik, tapi laporan tetap lewat.
    console.error('[pembatas-laju] gagal memeriksa laju — laporan TETAP diproses:', err)
    return TIDAK_AKTIF
  }
}
