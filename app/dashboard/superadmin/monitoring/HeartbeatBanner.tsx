// app/dashboard/superadmin/monitoring/HeartbeatBanner.tsx
// M7 — Spanduk "pemantauan tidak berdenyut", SATU rumah untuk SELURUH halaman Monitoring.
//
// Dibuat: Sesi #462 — butir 2 K-462-1.
//
// KENAPA BERKAS SENDIRI, BUKAN TETAP MENUMPANG SystemBadgeGrid.tsx:
//   Spanduk ini semula hidup di dalam SystemBadgeGrid (S#331, diperbaiki S#460). Berkas itu adalah
//   kisi badge L1 — ia HANYA dipakai halaman Status & Health (dan kembarannya yang menunya mati).
//   Tiga halaman Monitoring lain — Deep Metrics, Laporan Uptime, Riwayat Alert — menampilkan angka
//   yang diisi cron YANG SAMA, tetapi tidak punya kisi badge sama sekali (diukur S#462: ketiganya
//   nol import MonitoringClient, nol import SystemBadgeGrid). Selama spanduk terkurung di dalam
//   kisi badge, ketiga halaman itu menampilkan angka basi TANPA penanda apa pun.
//   ⛔ Menyalin blok spanduknya ke 4 berkas = 4 salinan yang akan menyimpang satu per satu —
//   ATURAN 19 poin 6 ("logic yang sama di >1 tempat = bug arsitektur"). Karena itu ia DIANGKAT
//   ke satu komponen bersama, bukan digandakan.
//
// ATURAN 19 (cek registry SEBELUM membuat): code_registry.cr_functions disapu S#462 dengan pola
//   heartbeat / stale / banner / spanduk / denyut / basi + seluruh file_path monitoring — 21 baris
//   ketemu, NOL di antaranya komponen spanduk. Tidak ada yang diduplikasi oleh berkas ini.
//
// ⚠️ TAMPILAN SENGAJA TIDAK DIUBAH SEDIKIT PUN (ATURAN 55.4 — layar ini sudah lulus TC Philips
//   di S#461). Kelas warna, bentuk kotak, dan seluruh kalimatnya DISALIN PERSIS dari
//   SystemBadgeGrid.tsx S#460. Nol kata diubah, nol warna diubah, nol ikon baru.
//
// 🔴 GERBANG TAMPIL HANYA `isStale === true` — DILARANG menambahkan syarat "angkanya ada"
//   (T-460-10). Saat cron BELUM PERNAH berdenyut atau Redis mati, service memulangkan
//   isStale=true DENGAN angka null; menambah syarat angka akan membungkam dua keadaan TERBURUK.
//
// ⚠️ Sengaja TANPA 'use client': komponen ini murni props → markup, nol hook, nol browser API.
//   Dengan begitu ia sah dipanggil dari halaman RSC (Deep Metrics / Laporan Uptime / Riwayat Alert)
//   MAUPUN dari dalam komponen klien SystemBadgeGrid.tsx.

interface Props {
  /** M7: satu-satunya gerbang tampil. undefined/false/null ⇒ spanduk TIDAK dirender. */
  isStale?:    boolean
  /** Menit sejak denyut terakhir; null = belum pernah berdenyut. */
  minutesAgo?: number | null
  /** DIPERTAHANKAN demi pemanggil lama; dipakai hanya kalau minutesAgo tidak dikirim. */
  hoursAgo?:   number | null
}

// M7 (S#460) — selang waktu → kalimat bahasa manusia (C4).
// SENGAJA tidak diekspor: teks spanduk wajib punya SATU rumah, dan rumah itu berkas ini.
function teksDenyut(minutesAgo?: number | null, hoursAgo?: number | null): string {
  const menit = minutesAgo ?? (hoursAgo != null ? hoursAgo * 60 : null)

  // Keadaan TERBURUK: belum pernah berdenyut / status tidak terbaca. Wajib berbunyi paling keras.
  if (menit == null) {
    return '⚠ Pemantauan belum pernah berdenyut. Harap periksa cron job.'
  }
  if (menit < 60) {
    return `⚠ Pemantauan tidak berdenyut sejak ${menit} menit lalu. Harap periksa cron job.`
  }
  const jam  = Math.floor(menit / 60)
  const sisa = menit % 60
  return sisa === 0
    ? `⚠ Pemantauan tidak berdenyut sejak ${jam} jam lalu. Harap periksa cron job.`
    : `⚠ Pemantauan tidak berdenyut sejak ${jam} jam ${sisa} menit lalu. Harap periksa cron job.`
}

export function HeartbeatBanner({ isStale, minutesAgo, hoursAgo }: Props) {
  if (isStale !== true) return null

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
      {teksDenyut(minutesAgo, hoursAgo)}
    </div>
  )
}
