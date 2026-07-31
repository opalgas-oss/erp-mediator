// lib/utils/penanda-laporan.util.ts
// KATEGORI: pembentukan TIGA PENANDA yang dipakai tabel `app_error_log` —
//           `insiden_key` (penanda GANGGUAN) · `sidik_profil` (penanda PELAPOR) · `dedup_key`.
//
// Dibuat: Sesi #426 — perintah K-424-5 bagian A poin 3.
// Satu dari tiga berkas hasil pemecahan (ATURAN 10):
//   · `ip-pelapor.util.ts`                   — membaca ALAMAT IP dari header
//   · `perangkat-pelapor.util.ts`            — mengurai BROWSER + PERANGKAT dari `user_agent`
//   · `penanda-laporan.util.ts` (berkas ini) — MENGOLAH keduanya menjadi tiga penanda
//
// Berkas ini tidak membaca header apa pun. Ia hanya MENGOLAH nilai yang sudah dibaca dua berkas
// di atas — itulah batas kategorinya, dan itu pula sebabnya ia berdiri sendiri: alasan
// perubahannya di masa depan datang dari ATURAN PENAHANAN, bukan dari bentuk header.
//
// ═══ ⛔ `sidik_profil` TIDAK DI-HASH — INI KEPUTUSAN SADAR ═══════════════════════════════════
// Bentuknya ditulis terbaca manusia: `anon:<ip>|<browser>|<perangkat>`.
// K-424-6 melarang IP di-hash, dipotong oktetnya, atau disamarkan. Larangan itu menyebut kolom
// `ip_pelapor`; tetapi pada bacaan PALING KETAT (KAMUS Pasal 0.2), penanda pelapor pun ditulis
// apa adanya — supaya Philips dan tim Support bisa membaca isi baris `app_error_log` langsung,
// tanpa alat bantu, tanpa perlu bertanya kepada siapa pun apa arti barisnya.
// `sidik_profil` BUKAN pengganti `ip_pelapor`: IP tetap tersimpan penuh di kolomnya sendiri.
//
// ═══ ⚠️ ISTILAH "DEDUP" DILARANG UNTUK JALUR INI (K-425-3) ══════════════════════════════════
// Nama kolomnya memang masih `dedup_key` — warisan S#420 yang sengaja TIDAK diganti supaya tidak
// ada migrasi yang tidak perlu — tetapi ARTINYA sudah dibalik di S#425. Sebutan yang benar adalah
// **PENAHANAN PER-PROFIL**.
// Ini bukan soal selera kata. Kata "dedup" masuk lewat catatan sesi sebelumnya, lalu membawa
// serta bagasi mekanisme lamanya: jendela waktu 10 menit yang TIDAK PERNAH diperintahkan Philips.
// Akibatnya, pelapor yang sama di halaman yang sama akan lolos lagi sesudah 10 menit dan tim
// menerima email kedua — persis yang perintah K-424-5 larang. Istilahnya dilarang supaya aturan
// yang salah tidak punya kendaraan untuk kembali.

import 'server-only'
import { TIDAK_DIKENAL } from '@/lib/utils/perangkat-pelapor.util'

// ─── Nilai jaga-jaga ──────────────────────────────────────────────────────────
// `insiden_key` dan `sidik_profil` adalah kolom NOT NULL TANPA nilai bawaan — diverifikasi dari
// `information_schema` S#426, dan dibuktikan dengan uji INSERT nyata yang ditolak
// `not_null_violation`. Karena itu SETIAP fungsi di berkas ini WAJIB selalu mengembalikan string
// berisi; tidak boleh ada satu jalur pun yang menghasilkan string kosong.
const TANPA_IP     = 'tanpa-ip'
const TANPA_DIGEST = 'tanpa-digest'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface SidikProfilInput {
  /** id pengguna dari SESI SERVER — bukan dari body permintaan (bisa dipalsukan klien) */
  uid:       string | null
  ip:        string | null
  browser:   string
  perangkat: string
}

// ─── buatInsidenKey ───────────────────────────────────────────────────────────
/**
 * Penanda **GANGGUAN** — bukan penanda pelapor (K-424-5 poin 3).
 *
 * Bentuk: `{digest|tanpa-digest}::{route_path}`.
 *
 * Inilah yang mengelompokkan BANYAK pelapor pada satu gangguan yang sama, dan menjadi dasar
 * hitungan pelapor UNIK untuk email eskalasi (K-425-2) —
 * `count(DISTINCT sidik_profil)` per `insiden_key`.
 *
 * `route_path` dipakai, BUKAN alamat lengkap: query string yang berubah-ubah (`?cek=s424h`,
 * `?cek=s424i`) akan memecah pengelompokan dan membuat SATU gangguan tampak seperti BANYAK
 * gangguan berbeda. Itu sudah dibuktikan di TC-MTC-KONTAK-07 (S#424) — parameter URL sengaja
 * dibedakan justru untuk membuktikan pengelompokannya tidak pecah.
 *
 * Halaman publik tidak punya `digest` (tidak ada error boundary di sana), sehingga bagian itu
 * jatuh ke `tanpa-digest` dan kuncinya tetap stabil.
 */
export function buatInsidenKey(digest: string | null, routePath: string): string {
  const bagianDigest = digest?.trim() ? digest.trim() : TANPA_DIGEST
  const bagianRoute  = routePath.trim() !== '' ? routePath.trim() : '/'
  return `${bagianDigest}::${bagianRoute}`
}

// ─── buatSidikProfil ──────────────────────────────────────────────────────────
/**
 * Penanda **PELAPOR** (K-424-5 poin 3).
 *
 * · Sudah login  → `uid:<uuid>` — identitas pasti, tidak perlu ditebak dari perangkat.
 * · Publik       → `anon:<ip>|<browser>|<perangkat>`
 *
 * **Tidak di-hash, tidak dipotong.** Alasan lengkapnya di kepala berkas ini.
 *
 * ⚠️ Sidik untuk pengunjung publik memang BISA BERUBAH kalau ia berganti jaringan atau peramban —
 * dan itu BENAR menurut perintahnya, bukan cacat: profil BERBEDA adalah salah satu dari PERSIS
 * DUA hal yang melepas penahanan (K-425-3). Yang menahan satu orang yang berganti-ganti IP bukan
 * fungsi ini, melainkan PEMBATAS LAJU per-IP (bagian B). Dua pagar berbeda untuk dua masalah
 * berbeda — menyamakan keduanya adalah akar kekeliruan yang dikoreksi Philips di S#425.
 */
export function buatSidikProfil(input: SidikProfilInput): string {
  const uid = input.uid?.trim()
  if (uid) return `uid:${uid}`

  const ip        = input.ip?.trim() || TANPA_IP
  const browser   = input.browser.trim()   || TIDAK_DIKENAL
  const perangkat = input.perangkat.trim() || TIDAK_DIKENAL

  return `anon:${ip}|${browser}|${perangkat}`
}

// ─── buatDedupKey ─────────────────────────────────────────────────────────────
/**
 * Kunci **PENAHANAN PER-PROFIL**: `{insiden_key}::{sidik_profil}` (K-424-5 poin 3).
 *
 * Yang melepas penahanan PERSIS DUA:
 *   1. halaman BERBEDA  → `insiden_key` berubah
 *   2. profil  BERBEDA  → `sidik_profil` berubah
 *
 * **WAKTU BUKAN PELEPAS.** DILARANG memakai `error_report_dedup_minutes` sebagai gerbang lolos
 * (K-425-3). Penahanan berlaku terus sampai baris `app_error_log` ditandai `SELESAI`.
 *
 * Nama fungsi ini memakai kata `dedup` HANYA karena nama kolomnya demikian; lihat peringatan
 * istilah di kepala berkas.
 */
export function buatDedupKey(insidenKey: string, sidikProfil: string): string {
  return `${insidenKey}::${sidikProfil}`
}
