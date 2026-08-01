// components/maintenance/lapor-gangguan.kirim.ts
// JALUR DATA tombol lapor gangguan — menyusun alamat halaman, memanggil `/api/error-report`,
// lalu menerjemahkan responsnya menjadi varian Pop Up. NOL React, NOL keadaan komponen, NOL JSX.
//
// Lahir: Sesi #429 — pemecahan `LaporGangguanButton.tsx` (10.164 B = 99,3% batas 10.240 B) atas
//   perintah Philips. Sumbu pemecahan = ALASAN BERUBAH, sama dengan K-426-2 dan K-428-3: berkas
//   ini berubah kalau KONTRAK `/api/error-report` berubah; komponennya berubah kalau TAMPILAN
//   berubah. Dua alasan berubah yang tidak pernah datang bersamaan = dua rumah.
//   Isi dipindah MEKANIS per-baris dari salinan byte-exact — komentar NOL karakter diketik ulang
//   (K-426-2 melarang merampingkan komentar).
//
// SENGAJA TANPA `import 'server-only'` dan tanpa `'use client'`: berkas ini murni logika permintaan
//   yang dipanggil dari Client Component. Menandainya `server-only` akan meruntuhkan halaman
//   PUBLIK — persis bahaya yang `lib/types/lapor-gangguan.type.ts` lahir untuk mencegah.
//
// ⛔ IDENTITAS PELAPOR TIDAK PERNAH DIKIRIM DARI SINI. IP dan `user-agent` dibaca server dari
//   HEADER (lihat `app/api/error-report/route.ts`) — body hanya membawa keterangan halaman.

import type { AreaLaporan }        from '@/lib/types/lapor-gangguan.type'
import type { VarianPopUpLaporan } from '@/components/maintenance/PopUpLaporGangguan'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

/**
 * Keterangan halaman yang dilaporkan.
 * Nama medannya SENGAJA sama persis dengan nama prop komponen, supaya seluruh baris pernyataan
 * di bawah bisa dipindah VERBATIM — nol baris yang perlu disesuaikan, nol peluang salah ketik.
 */
export interface MuatanLaporan {
  routePath?:  string
  namaHalaman: string | null
  area:        AreaLaporan
  digest:      string | null
  pesan:       string | null
  menuKey:     string | null
}

/** Hasil yang bisa dibedakan kompilator — pemanggil tidak perlu menebak medan mana yang terisi. */
export type HasilKirimLaporan =
  | { status: 'berhasil'; bugCode: string; varian: VarianPopUpLaporan }
  | { status: 'gagal' }

// ─── Pengiriman ───────────────────────────────────────────────────────────────

export async function kirimLaporanGangguan({
  routePath, namaHalaman, area, digest, pesan, menuKey,
}: MuatanLaporan): Promise<HasilKirimLaporan> {
  try {
    // URL LENGKAP diambil di klien — hanya di sinilah host + query benar-benar diketahui.
    // Koreksi Philips S#424: tim Support butuh alamat yang bisa langsung dibuka, bukan `/`.
    // Dikirim TERPISAH dari `routePath` supaya dedup tidak pecah oleh query string.
    const alamatLengkap =
      typeof window !== 'undefined' ? window.location.href : null

    // ALAMAT HALAMAN (S#429) — dioper pemanggil kalau ada; kalau tidak, dibaca sendiri di klien.
    // Ini yang menutup `HUTANG-ROUTEPATH-HARDCODE`: nilainya kini mengikuti halaman yang benar-
    // benar dibuka, jadi komponen bersama ini otomatis benar di rumah keduanya nanti (halaman
    // error dashboard) tanpa satu baris pun diuji ulang di sana — itu inti DRY (ATURAN 19).
    const routePathFinal =
      routePath ?? (typeof window !== 'undefined' ? window.location.pathname : null)

    // GAGAL BERISIK, bukan gagal senyap (BUG-034 · BUG-038). DILARANG menambal dengan '/' —
    // nilai tambalan itulah yang justru melahirkan hutang ini.
    if (!routePathFinal) {
      console.error('[LaporGangguan] alamat halaman tidak terbaca — laporan dibatalkan')
      return { status: 'gagal' }
    }

    const res = await fetch('/api/error-report', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        routePath: routePathFinal, alamatLengkap, namaHalaman, menuKey, digest, pesan, area,
      }),
    })

    const data = await res.json().catch(() => null)

    if (res.ok && data?.success) {
      // `barisBaru` adalah SATU-SATUNYA penentu Pop Up mana yang tampil:
      //   true  ⇒ laporan melahirkan baris baru                    ⇒ Pop Up 1 (terkirim)
      //   false ⇒ PENAHANAN PER-PROFIL (profil sama + halaman sama) ⇒ Pop Up 2 (ditahan)
      // ⛔ TANPA batas waktu — waktu BUKAN pelepas penahanan (K-425-3).
      //
      // Nilai selain `true` sengaja jatuh ke 'ditahan': kalau server suatu saat berhenti
      // mengirim medan ini, yang muncul adalah Pop Up "sedang ditangani" — menahan diri lebih
      // aman daripada menjanjikan baris baru yang belum tentu ada.
      return {
        status:  'berhasil',
        bugCode: String(data.bugCode ?? ''),
        varian:  data.barisBaru === true ? 'terkirim' : 'ditahan',
      }
    } else {
      // Tidak ditelan diam-diam (BUG-034 · BUG-038) — pengguna diberi tahu, dan jejaknya
      // ada di konsol untuk penelusuran.
      console.error('[LaporGangguan] server menolak laporan:', data)
      return { status: 'gagal' }
    }
  } catch (err) {
    console.error('[LaporGangguan] permintaan gagal:', err)
    // KOREKSI S#429: baris ini dulu `setKeadaan('gagal')` — ikut terbawa saat blok dipindah
    // verbatim, padahal `setKeadaan` milik komponen, bukan modul ini. Build yang menangkapnya,
    // bukan pembacaan. Keadaan komponen diurus pemanggil; modul ini hanya melaporkan hasil.
    return { status: 'gagal' }
  }
}
