// lib/utils/wa-link.util.ts
// Menyusun tautan WhatsApp (wa.me) untuk melaporkan gangguan — kanal KEDUA di samping `mailto:`.
// Dipakai oleh: MaintenanceView.tsx (halaman maintenance publik) + ErrorFallbackView.tsx (FASE 3.6e).
// Dibuat: Sesi #424 — K-424-1 (keputusan Philips): "No WA bisa digunakan untuk mengirimkan pesan
//   error ini; Email tetap digunakan sebagai dokumentasi dan Log."
//   ⇒ WA = kanal KIRIM (andal, tidak butuh aplikasi email terpasang).
//   ⇒ Email = kanal DOKUMENTASI & LOG (jejak tertulis yang bisa diarsipkan).
//   Keduanya berdampingan. WA BUKAN pengganti email.
//
// ⚠️ BERKAS INI SENGAJA **TANPA** `import 'server-only'` — simetris dengan `bug-mailto.util.ts`
//    (K-420-4). Halaman error wajib Client Component (`usePathname()` + `error.digest`), jadi util
//    ini harus bisa berjalan di klien maupun server.
//
// ⚠️ KENAPA UTIL INI ADA, padahal ATURAN 19 melarang duplikasi.
//    Registry `code_registry.cr_functions` DIPERIKSA LEBIH DULU (S#424). Yang sudah ada hanya
//    normalisasi nomor — dan tidak satu pun bisa dipakai di sini:
//      · `autoCorrectWA`               lib/utils-client.ts          → ber-`'use client'`; berkasnya
//                                       menyatakan "tidak boleh dipakai di Server Components"
//      · `normalisasiNomorWa`          lib/utils/otp-only.server.ts → server, TAPI domain AUTH dan
//                                       modulnya menarik `createServerSupabaseClient`
//      · `TenantService_formatNomorWa` lib/services/tenant.service.ts → `is_shared=false`, domain tenant
//      · `validateNomorWa`             lib/utils/validation.server.ts → hanya MELEMPAR galat; tidak
//                                       menormalkan, dan MENUNTUT nomor sudah berprefiks `62`
//    NOL fungsi di registry yang membangun URL `wa.me` + pesan. Itu tanggung jawab BARU — dan itulah
//    satu-satunya isi util ini. Substitusi variabel TIDAK ditulis ulang: dipakai ulang dari
//    `bug-mailto.util.ts` supaya jalur email dan jalur WA MUSTAHIL drift (ATURAN 19 poin 5).
//
// ⚠️ TEMUAN DICATAT TERBUKA, bukan disembunyikan — `TEMUAN-NORMALISASI-WA-EMPAT-RUMAH`:
//    logika normalisasi nomor WA hidup di EMPAT tempat berbeda (daftar di atas). Menurut ATURAN 19
//    poin 5 itu bug arsitektur. Menyatukannya BUKAN scope S#424 (ATURAN 5, anti-overreach).
//
// ⚠️ TEMUAN KEDUA — `TEMUAN-TELEPON-TEAMCONTACTS-BUKAN-62`:
//    `team_contacts.telepon` menyimpan format lokal (`08164851879`), sedangkan standar platform
//    adalah `62xxx` (ATURAN 41 kelas yang sama: dua format hidup berdampingan). `validateNomorWa`
//    akan MELEMPAR galat untuk nilai `08...`. Karena itu normalisasi di bawah menerima `0`/`8`/`62`
//    dan TIDAK melempar — halaman publik DILARANG tumbang hanya karena format nomor.

import { isiVariabel, buangBarisKosong } from '@/lib/utils/bug-mailto.util'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface BugWaInput {
  /** Nomor tujuan — dari `team_contacts.telepon`, BUKAN dari config (poin 6 Philips) */
  nomorTujuan:    string
  /** Template pesan, dari `message_library` `error_wa_message` */
  templatePesan:  string
  namaHalaman:    string
  alamatHalaman:  string
  /** Waktu sudah diformat sesuai zona platform — pembentukannya bukan urusan util ini */
  waktu:          string
  /** Nama brand — dioper PROP dari server (K-420-4) */
  brandName:      string
  /** Email pengguna dari sesi. Kosong → BARIS ITU DIHAPUS dari pesan (§8) */
  pengguna?:      string | null
  /** `error.digest`. Kosong → BARIS ITU DIHAPUS dari pesan (§8) */
  kodeError?:     string | null
}

// ─── Normalisasi nomor ke bentuk yang diterima wa.me ──────────────────────────
/**
 * `wa.me` hanya menerima nomor internasional TANPA `+`, tanpa spasi, tanpa tanda hubung.
 *
 * Menerima `08xxx` · `8xxx` · `62xxx` · `+62 xxx` · `0812-3456-7890`.
 * Mengembalikan `null` — BUKAN melempar — kalau nomor tidak bisa dipakai. Alasannya: util ini
 * dipanggil dari halaman PUBLIK (maintenance). Melempar galat di sana berarti pengunjung melihat
 * halaman tumbang, padahal cacatnya cuma satu nomor salah format. `null` ⇒ tombol WA tidak
 * dirender, persis pola §6.3 untuk email ("tidak ada ajakan tanpa alamat di baliknya").
 *
 * @param nomor - Nomor mentah dari `team_contacts.telepon`
 * @returns Nomor berprefiks `62` hanya-digit, atau `null` kalau tidak layak
 */
export function normalkanNomorWaLink(nomor: string | null | undefined): string | null {
  const digit = (nomor ?? '').replace(/\D/g, '')
  if (!digit) return null

  let hasil = digit
  if (hasil.startsWith('620')) hasil = '62' + hasil.slice(3)  // 62 + 08xx → 628xx
  else if (hasil.startsWith('0')) hasil = '62' + hasil.slice(1)
  else if (hasil.startsWith('8')) hasil = '62' + hasil

  // Panjang dinilai dengan ambang yang SAMA dengan validateNomorWa (10–15 digit) supaya dua
  // pemeriksaan di repo ini tidak saling bertentangan.
  if (!hasil.startsWith('62') || hasil.length < 10 || hasil.length > 15) return null

  return hasil
}

// ─── buildBugWaLink ───────────────────────────────────────────────────────────
/**
 * Bentuk tautan `https://wa.me/<62xxx>?text=<pesan>` dengan pesan terisi otomatis.
 *
 * Dipilih `wa.me` (bukan `whatsapp://` maupun `api.whatsapp.com`) karena `wa.me` adalah tautan
 * resmi WhatsApp yang bekerja di ketiga tempat sekaligus: aplikasi WhatsApp di ponsel, WhatsApp
 * Desktop, dan WhatsApp Web di browser. Inilah kelebihannya atas `mailto:` — ia TIDAK bergantung
 * pada aplikasi yang terpasang di komputer, sehingga tidak bisa gagal senyap seperti `mailto:`
 * di jendela Incognito (T-424-4).
 *
 * @returns string URL siap dipasang di `href`, atau `null` kalau nomor tujuan tidak layak
 */
export function buildBugWaLink(input: BugWaInput): string | null {
  const nomor = normalkanNomorWaLink(input.nomorTujuan)
  if (!nomor) return null

  const pengguna  = (input.pengguna  ?? '').trim()
  const kodeError = (input.kodeError ?? '').trim()

  const kosong: string[] = []
  if (!pengguna)  kosong.push('pengguna')
  if (!kodeError) kosong.push('kode_error')

  const nilai: Record<string, string> = {
    nama_halaman:   input.namaHalaman,
    alamat_halaman: input.alamatHalaman,
    waktu:          input.waktu,
    brand_name:     input.brandName,
    pengguna,
    kode_error:     kodeError,
  }

  const pesan = isiVariabel(buangBarisKosong(input.templatePesan, kosong), nilai)

  // WhatsApp memakai LF untuk baris baru (BUKAN CRLF seperti RFC 6068 pada mailto).
  // CRLF dinormalkan ke LF lebih dulu supaya tidak muncul karakter %0D yang terbaca sebagai
  // baris kosong tambahan di dalam gelembung pesan.
  const pesanLf = pesan.replace(/\r\n/g, '\n')

  return `https://wa.me/${nomor}?text=${encodeURIComponent(pesanLf)}`
}
