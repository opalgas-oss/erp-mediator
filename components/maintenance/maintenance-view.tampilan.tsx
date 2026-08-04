// components/maintenance/maintenance-view.tampilan.tsx
// TEMA LATAR + ILUSTRASI halaman Maintenance — dipecah dari `MaintenanceView.tsx`.
//
// Lahir: Sesi #435. Sebab DIUKUR, bukan ditaksir: `MaintenanceView.tsx` menyentuh 9.750 B = 95,2%
//   batas 10.240 B sesudah prop `area` + komentarnya mendarat di sesi yang sama. Ambang TINDAKAN
//   berkas kode adalah 80% (8.192 B), bukan 100% — K-429-1, aturan yang lahir justru waktu berkas
//   ITU tertangkap di 99,3%. K-426-2 melarang jalan pintas "rampingkan komentarnya"; yang benar
//   MEMECAH. Ambangnya terlewat oleh pekerjaan S#435 sendiri, jadi dibersihkan di S#435 juga —
//   tidak diwariskan (POLA S#430).
//
// SUMBU PEMECAHAN = ALASAN BERUBAH (ATURAN 50.5), bukan ukuran dan bukan urutan baris:
//   · berkas INI          → berubah kalau PRESET ILUSTRASI atau TEMA WARNA bertambah/berubah
//   · `MaintenanceView`   → berubah kalau TATA LETAK halaman berubah
//   Dua alasan berubah = dua rumah. Sebelum ini keduanya satu berkas, sehingga menambah satu
//   preset SVG memaksa membuka berkas yang juga memuat kerangka halaman.
//
// PEMINDAHAN MEKANIS dari salinan byte-exact ber-checksum (SHA-256 010ee82a…, 9.750 B) — nol
// karakter melewati ketikan Claude. Batas blok DIHITUNG PROGRAM (baris 12–55), petanya dicetak
// SEBELUM satu baris dipindah, dan rekonstruksi `atas + pindah + bawah` diuji byte-identik dengan
// berkas asal LEBIH DULU. Satu-satunya perubahan pada isi yang dipindah: kata kunci `export`
// ditambahkan ke DUA deklarasi — `THEME_CLASS` dan `Illustration` — karena keduanya dipakai
// `MaintenanceView` dan tanpa itu berkas ini melahirkan luka `ENV_FALLBACK` (S#428) / `setKeadaan`
// (S#429): simbol yang PRIVAT di rumah lama wajib diekspor dari rumah baru.
//
// `PresetIllustration` SENGAJA TIDAK di-export — nol berkas lain memakainya; ia hanya dipanggil
// `Illustration` di berkas yang sama. Mengekspornya = memperluas permukaan tanpa pemakai.
//
// Server component murni, sama dengan induknya: nol `'use client'`, nol keadaan, nol efek.
// Nol impor — sama seperti sebelum dipecah, blok ini memang tidak bergantung pada apa pun.
//
// Arsip pra-pemecahan byte-exact: _arsip/coding-history/sesi-435-gerbang-maintenance/
// ─── Tema warna latar (dari config maintenance_theme) ─────────────────────────
export const THEME_CLASS: Record<string, string> = {
  terang: 'bg-gradient-to-b from-slate-50 to-blue-50 text-slate-800',
  brand:  'bg-gradient-to-b from-blue-600 to-blue-800 text-white',
  senja:  'bg-gradient-to-b from-orange-100 to-rose-100 text-slate-800',
  mint:   'bg-gradient-to-b from-emerald-50 to-teal-100 text-slate-800',
}

// ─── Preset ilustrasi bawaan (SVG inline + animasi halus) ─────────────────────
function PresetIllustration({ id }: { id: string }) {
  const common = 'w-28 h-28 mx-auto'
  if (id === 'preset_gear') {
    return (
      <svg className={`${common} animate-spin`} style={{ animationDuration: '6s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    )
  }
  if (id === 'preset_rocket') {
    return (
      <svg className={`${common} animate-bounce`} style={{ animationDuration: '2.5s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    )
  }
  // default: preset_wrench
  return (
    <svg className={`${common} animate-pulse`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 00-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 005.6-5.6l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z" />
    </svg>
  )
}

export function Illustration({ illustration }: { illustration: string }) {
  if (illustration.startsWith('preset_')) {
    return <PresetIllustration id={illustration} />
  }
  // URL hasil upload SA (Supabase Storage) — bukan hardcode, path dari config
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={illustration} alt="" className="w-28 h-28 mx-auto object-contain" />
}
