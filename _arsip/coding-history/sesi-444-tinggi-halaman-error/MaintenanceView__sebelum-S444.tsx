// components/maintenance/MaintenanceView.tsx
// Tampilan halaman Maintenance publik — terang, ramah, beranimasi (acuan MOCKUP_sistem_v1.html).
// Server component murni (tanpa interaktivitas) — semua isi dari props (config sistem).
//
// Dibuat: Sesi #412 — HUTANG-PAGE-CONFIG-SA page `sistem`, consumer loop-tertutup (ATURAN 34).
// Ilustrasi: id preset (preset_*) → SVG bawaan app; selain itu dianggap URL (hasil upload SA ke Storage).

import type { MaintenanceConfig } from '@/lib/maintenance'
import type { AreaLaporan }       from '@/lib/types/lapor-gangguan.type'
import { MaintenanceViewAksi }    from '@/components/maintenance/maintenance-view.aksi'


// ⚠️ DIPECAH Sesi #435 — TEMA + ILUSTRASI pindah ke `./maintenance-view.tampilan`.
//   Berkas ini sempat 9.750 B = 95,2% batas 10.240 B; ambang tindakan 80% (K-429-1). Sumbu pecah
//   = ALASAN BERUBAH: preset/tema di sana, tata letak di sini. Pemindahan mekanis dari salinan
//   byte-exact, nol komentar dipangkas (K-426-2). Alasan lengkap ada di kepala berkas tujuan.
import { THEME_CLASS, Illustration } from '@/components/maintenance/maintenance-view.tampilan'
// ⚠️ DIPECAH LAGI Sesi #439 — BLOK AKSI (tombol lapor + seluruh riwayat kanal kontaknya, 74 baris
//   / 4.496 B) pindah ke `./maintenance-view.aksi`. Sumbu pecah = ALASAN BERUBAH: aksi pengguna di
//   sana, tata letak di sini. Pemicunya diukur, bukan ditaksir: berkas ini 7.849 B = 76,7% dan
//   langkah 2 S#439 menuntut prop `digest` + tombol "Coba Lagi" yang bersama-sama menembus ambang
//   tindakan 80% (8.192 B, K-429-1). Alasan lengkap + bukti uji balik ada di kepala berkas tujuan.

/**
 * `area` WAJIB, sengaja TANPA nilai bawaan — S#435, menutup `TEMUAN-429-AREA-HARDCODE` (#64).
 *
 * Sebelum sesi ini komponen ini mengirim `area="publik"` HARFIAH ke tombol lapor. Selama gerbang
 * maintenance hanya terpasang di halaman publik, kekeliruan itu tidak terlihat. Begitu
 * `MaintenanceGate` memasang komponen yang SAMA di Dashboard Vendor dan AdminTenant, setiap
 * laporan dari kedua dashboard itu akan tercatat `area='publik'` di `app_error_log` — kolom NOT
 * NULL yang dipakai memilah laporan per permukaan.
 *
 * Nilai bawaan SENGAJA tidak diberikan: nilai bawaan adalah bentuk lain dari hardcode yang sama,
 * dan ia gagal SENYAP (data salah, layar normal). Tanpa bawaan, pemanggil yang lupa mengoper
 * `area` ditolak KOMPILATOR — gagal berisik di meja developer, bukan di tabel audit.
 */
// ⛔ S#437 — tipe `area` dilepas dari `lib/constants/maintenance.constant.ts`; berkas konstanta itu
//   dibongkar sesi ini (K-436-1: `maintenance_mode` = saklar TAMPILAN, bukan gerbang). `AreaGerbang`
//   di sana hanya alias murni `AreaLaporan` ⇒ tipe IDENTIK, NOL perubahan perilaku, hanya alamat
//   impor. Dilepas LEBIH DULU supaya berkas ini tidak ikut patah saat konstanta dibuang — kelas
//   `ENV_FALLBACK` (S#428) dan `setKeadaan` (S#429). Alasan lengkap: `KERJA_SESI_437`.
interface MaintenanceViewProps {
  data: MaintenanceConfig
  area: AreaLaporan
  /** S#439 — diteruskan apa adanya ke `MaintenanceViewAksi`; alasannya di kepala berkas itu. */
  namaHalaman?: string | null
  digest?:      string | null
  cobaLagi?:    { teks: string; onKlik: () => void }
}

export function MaintenanceView({
  data, area, namaHalaman, digest = null, cobaLagi,
}: MaintenanceViewProps) {
  const themeClass = THEME_CLASS[data.theme] ?? THEME_CLASS.terang

  return (
    <main className={`min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 ${themeClass}`}>
      <div className="max-w-md text-center">
        <div className="mb-6 opacity-90">
          <Illustration illustration={data.illustration} />
        </div>

        <h1 className="text-2xl font-semibold mb-3">{data.title}</h1>

        <p className="text-sm leading-relaxed opacity-90 whitespace-pre-line">{data.body}</p>

        {data.eta && (
          <p className="mt-5 inline-block rounded-full bg-black/5 px-4 py-1.5 text-xs font-medium">
            {data.etaPrefix} {data.eta}
          </p>
        )}

        <MaintenanceViewAksi
          data={data}
          area={area}
          namaHalaman={namaHalaman}
          digest={digest}
          cobaLagi={cobaLagi}
        />
      </div>
    </main>
  )
}
