// lib/utils/bug-mailto.util.ts
// Menyusun tautan `mailto:` laporan bug sesuai RFC 6068 — DESAIN_MAINTENANCE_DAN_KONTAK_TIM §8.
// Dipakai oleh: MaintenanceView.tsx (halaman maintenance publik) + ErrorFallbackView.tsx (halaman error)
// Dibuat: Sesi #423 — Direktori Kontak Tim Tahap A, FASE 3.6b
//
// ⚠️ BERKAS INI SENGAJA **TANPA** `import 'server-only'`.
//    K-420-4: `buildBugMailto` berjalan di CLIENT COMPONENT (halaman error wajib Client Component
//    karena membaca `usePathname()` dan `error.digest`). Nama brand dioper PROP dari server —
//    `getNamaBrandPlatform()` ber-`server-only` dan TIDAK boleh diimpor dari sini.
//
// ⚠️ CATATAN DUPLIKASI YANG DISEBUT TERBUKA (bukan disembunyikan):
//    `interpolate()` di `lib/message-library.ts` melakukan substitusi yang sama, TAPI modul itu
//    ber-`server-only` sehingga tidak bisa diimpor Client Component. Substitusi di bawah dibuat
//    identik perilakunya — regex `\{(\w+)\}`, kurung TUNGGAL — supaya kalau salah satu berubah,
//    perbedaannya terlihat sebagai perbedaan nyata, bukan kebetulan.
//    Kurung TUNGGAL adalah bentuk yang benar; dokumen desain §8 menulis kurung ganda `{{...}}`
//    dan itu KELIRU terhadap kode yang hidup (dikoreksi S#423, dicatat di Schema_MessageLibrary).
//
// Aturan penyandian RFC 6068 yang wajib dipatuhi (§8):
//   · baris baru ditulis `%0D%0A`
//   · karakter `?`, `=`, `&` di-escape
//   · teks non-ASCII di-UTF-8-kan lalu percent-encode
//   encodeURIComponent() menutup ketiganya, ASAL `\n` dinormalkan ke `\r\n` lebih dulu.

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface BugMailtoInput {
  /** Alamat tujuan — dari team_contacts, BUKAN dari config (poin 6 Philips) */
  emailTujuan:     string
  /** Template perihal, dari message_library `error_email_subject` */
  templatePerihal: string
  /** Template isi, dari message_library `error_email_body` */
  templateIsi:     string
  namaHalaman:     string
  alamatHalaman:   string
  /** Waktu sudah diformat sesuai zona platform — pembentukannya bukan urusan util ini */
  waktu:           string
  /** Nama brand — dioper PROP dari server (K-420-4) */
  brandName:       string
  /** Email pengguna dari sesi. Kosong → BARIS ITU DIHAPUS dari isi email (§8) */
  pengguna?:       string | null
  /** error.digest. Kosong → BARIS ITU DIHAPUS dari isi email (§8) */
  kodeError?:      string | null
}

// ─── Substitusi variabel — kurung TUNGGAL ─────────────────────────────────────

const POLA_VARIABEL = /\{(\w+)\}/g

function isiVariabel(teks: string, nilai: Record<string, string>): string {
  return teks.replace(POLA_VARIABEL, (_cocok, kunci: string) => nilai[kunci] ?? `{${kunci}}`)
}

// ─── Buang baris yang variabelnya kosong ──────────────────────────────────────
/**
 * §8 mewajibkan: kalau `{pengguna}` atau `{kode_error}` kosong, **baris itu dihapus** —
 * bukan ditulis "kosong" dan bukan dibiarkan menggantung sebagai "Pengguna   : ".
 * Baris dikenali dari kemunculan placeholder-nya SEBELUM substitusi dijalankan.
 */
function buangBarisKosong(template: string, variabelKosong: string[]): string {
  if (variabelKosong.length === 0) return template
  return template
    .split('\n')
    .filter((baris) => !variabelKosong.some((v) => baris.includes(`{${v}}`)))
    .join('\n')
}

// ─── buildBugMailto ───────────────────────────────────────────────────────────
/**
 * Bentuk tautan `mailto:` lengkap dengan perihal + isi awal terisi otomatis.
 *
 * Memakai skema `mailto:` standar (RFC 6068) supaya membuka aplikasi email bawaan di
 * komputer MAUPUN ponsel. **Bukan tautan khusus Gmail** — poin 5 Philips.
 *
 * @returns string `mailto:...` siap dipasang di `href`
 */
export function buildBugMailto(input: BugMailtoInput): string {
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

  const perihal = isiVariabel(input.templatePerihal, nilai)
  const isi     = isiVariabel(buangBarisKosong(input.templateIsi, kosong), nilai)

  // Normalkan ke CRLF DULU, baru encode → menghasilkan %0D%0A sesuai RFC 6068.
  const isiCrlf = isi.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')

  const params = `subject=${encodeURIComponent(perihal)}&body=${encodeURIComponent(isiCrlf)}`

  // Alamat tujuan tidak di-encodeURIComponent utuh: `@` sah dan tidak boleh berubah
  // menjadi %40 di bagian alamat mailto.
  return `mailto:${input.emailTujuan.trim()}?${params}`
}
