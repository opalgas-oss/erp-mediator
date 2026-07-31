// lib/utils/ip-pelapor.util.ts
// KATEGORI: pembacaan ALAMAT IP pelapor gangguan dari header permintaan server.
//
// Dibuat: Sesi #426 — perintah K-424-5 bagian A poin 1.
// Satu dari tiga berkas hasil pemecahan (ATURAN 10) — lihat "PETA PEMECAHAN" di bawah.
//
// ═══ PETA PEMECAHAN — K-424-5 bagian A dipecah jadi 3 berkas per KATEGORI ════════════════════
//   · `ip-pelapor.util.ts`        (berkas ini) — membaca ALAMAT IP dari header
//   · `perangkat-pelapor.util.ts`              — mengurai BROWSER + PERANGKAT dari `user_agent`
//   · `penanda-laporan.util.ts`                — membentuk 3 PENANDA: insiden_key · sidik_profil ·
//                                                dedup_key
// Ketiganya dipecah berdasarkan KATEGORI KERJA, bukan sekadar demi ukuran: sumber datanya beda
// (header vs user_agent vs hasil olahan), dan alasan perubahannya di masa depan juga beda.
// Alasan pemecahan: CODING_RULES_AI ATURAN 9 membatasi berkas kode 10 KB, dan ATURAN 10
// mewajibkan file yang melewati batas DIPECAH by kategori — BUKAN dirampingkan komentarnya.
// (Koreksi langsung Philips S#426 atas Claude yang sempat memangkas komentar. Memangkas konteks
// demi muat plafon adalah pola yang sudah dilarang sejak S#411.)
//
// ═══ KENAPA IP DIBACA DI SERVER, BUKAN DIKIRIM KLIEN ═════════════════════════════════════════
// Perintah K-424-5 poin 1 (Philips): IP diambil dari header `x-forwarded-for` elemen PERTAMA,
// **DILARANG dari body**. Alasannya bukan selera arsitektur: apa pun yang datang dari body
// permintaan bisa dipalsukan pengunjung. Kalau alamat IP bisa dipalsukan, maka PENAHANAN
// PER-PROFIL bisa dilewati hanya dengan mengarang isian — dan tim Support akan menerima email
// berulang dari orang yang sama, persis yang perintah itu larang.
//
// `import 'server-only'` di bawah bukan hiasan: ia membuat kesalahan itu MUSTAHIL secara mekanis.
// Kalau suatu saat ada Client Component yang mengimpor berkas ini, `npm run build` GAGAL — bukan
// lolos diam-diam lalu ketahuan berbulan-bulan kemudian.
//
// ═══ ⛔ LARANGAN K-424-6 — IP DICATAT PENUH ══════════════════════════════════════════════════
// IP pelapor disimpan APA ADANYA ke kolom `ip_pelapor` (inet). DILARANG di-hash, DILARANG dipotong
// oktetnya, DILARANG disamarkan. Larangan ini juga tertanam sebagai COMMENT kolom di dalam Supabase
// (S#425), jadi ia tidak bisa "dirapikan" sesi berikutnya tanpa dibaca lebih dulu.
// DILARANG pula mengembalikan IP di respons API — berkas ini hanya MEMBACA; yang menjaga agar ia
// tidak ikut keluar adalah `app/api/error-report/route.ts`.

import 'server-only'

// ─── Pengenalan bentuk alamat IP ──────────────────────────────────────────────
// Kolom `ip_pelapor` bertipe `inet`. Nilai yang bukan alamat IP akan DITOLAK PostgreSQL dan
// menggagalkan seluruh penyimpanan laporan. Karena header bisa diisi apa saja oleh perantara
// (atau oleh penyerang), bentuknya diperiksa lebih dulu; yang tidak berbentuk alamat IP
// dikembalikan sebagai null — kolomnya memang boleh kosong.
//
// ⚠️ Pemeriksaan ini adalah PENJAGA BENTUK, bukan penyamaran. Nilai yang lolos disimpan UTUH,
// tidak dipotong satu karakter pun (K-424-6).

const POLA_IPV4 =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

/** IPv4 dengan porta di belakangnya, mis. `203.0.113.9:52344` */
const POLA_IPV4_BERPORTA = /^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/

/** IPv6 dalam kurung siku, mis. `[2001:db8::1]:443` */
const POLA_IPV6_KURUNG = /^\[([^\]]+)\](?::\d{1,5})?$/

/**
 * Bentuk IPv6 diperiksa longgar TAPI TERBATAS: hanya heksadesimal, `:`, dan `.`
 * (titik diizinkan untuk bentuk campuran `::ffff:203.0.113.9`), wajib memuat `:`,
 * panjang maksimum 45 karakter — panjang maksimum sah sebuah alamat IPv6.
 */
const POLA_IPV6_LONGGAR = /^[0-9a-fA-F:.]{2,45}$/

function bentuknyaAlamatIp(nilai: string): boolean {
  if (POLA_IPV4.test(nilai)) return true
  return nilai.includes(':') && POLA_IPV6_LONGGAR.test(nilai)
}

// ─── bacaIpPelapor ────────────────────────────────────────────────────────────
/**
 * Ambil alamat IP pelapor dari header permintaan.
 *
 * **Elemen PERTAMA `x-forwarded-for`** — perintah K-424-5 poin 1. Di belakang Vercel, header ini
 * berisi rantai `klien, proksi1, proksi2`; yang paling kiri adalah pengunjung, sisanya perantara.
 * Mengambil elemen lain berarti mencatat alamat mesin Vercel, bukan alamat pelapor — dan seluruh
 * penahanan per-profil akan salah sasaran karena semua pengunjung tampak beralamat sama.
 *
 * Cadangan `x-real-ip` dipakai HANYA kalau `x-forwarded-for` tidak ada sama sekali.
 *
 * Porta dan kurung siku dilepas karena keduanya BUKAN bagian dari alamat: `inet` menolak
 * `203.0.113.9:52344`. Yang dilepas adalah pembungkusnya, alamatnya sendiri tetap utuh.
 *
 * @param headers - header permintaan server. **Bukan body** — body bisa dipalsukan klien.
 * @returns alamat IP PENUH apa adanya, atau `null` kalau tidak ada / bentuknya bukan alamat IP.
 */
export function bacaIpPelapor(headers: Headers): string | null {
  const rantai = headers.get('x-forwarded-for')
  const mentah = rantai
    ? rantai.split(',')[0]
    : headers.get('x-real-ip')

  if (!mentah) return null

  let nilai = mentah.trim()
  if (nilai === '') return null

  // Lepas kurung siku IPv6 + porta, mis. `[2001:db8::1]:443` → `2001:db8::1`
  const berkurung = nilai.match(POLA_IPV6_KURUNG)
  if (berkurung) nilai = berkurung[1]

  // Lepas porta IPv4, mis. `203.0.113.9:52344` → `203.0.113.9`
  const berporta = nilai.match(POLA_IPV4_BERPORTA)
  if (berporta) nilai = berporta[1]

  return bentuknyaAlamatIp(nilai) ? nilai : null
}
