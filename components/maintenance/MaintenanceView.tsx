// components/maintenance/MaintenanceView.tsx
// Tampilan halaman Maintenance publik — terang, ramah, beranimasi (acuan MOCKUP_sistem_v1.html).
// Server component murni (tanpa interaktivitas) — semua isi dari props (config sistem).
//
// Dibuat: Sesi #412 — HUTANG-PAGE-CONFIG-SA page `sistem`, consumer loop-tertutup (ATURAN 34).
// Ilustrasi: id preset (preset_*) → SVG bawaan app; selain itu dianggap URL (hasil upload SA ke Storage).

import type { MaintenanceConfig } from '@/lib/maintenance'
import { LaporGangguanButton }    from '@/components/maintenance/LaporGangguanButton'

// ─── Tema warna latar (dari config maintenance_theme) ─────────────────────────
const THEME_CLASS: Record<string, string> = {
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

function Illustration({ illustration }: { illustration: string }) {
  if (illustration.startsWith('preset_')) {
    return <PresetIllustration id={illustration} />
  }
  // URL hasil upload SA (Supabase Storage) — bukan hardcode, path dari config
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={illustration} alt="" className="w-28 h-28 mx-auto object-contain" />
}

export function MaintenanceView({ data }: { data: MaintenanceConfig }) {
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

        {/*
          §6.3 — ajakan menghubungi HANYA dirender kalau toggle SA menyala DAN ada kanal tujuan
          nyata di `team_contacts`. Kedua tautan digerbangi TERPISAH: kontak yang punya email tapi
          nomornya kosong hanya memunculkan tautan email, dan sebaliknya. Nol kanal → blok ini tidak
          dirender sama sekali — "tidak ada ajakan menghubungi tanpa alamat di baliknya".

          S#424 — T-424-4 (error yang Philips laporkan sebagai QA halaman maintenance):
          sebelumnya `href` di sini adalah `mailto:` + alamat SAJA, tanpa perihal dan tanpa isi.
          Email yang terbuka KOSONG melompong. Sekarang `data.mailtoHref` datang dari
          `buildBugMailto()` — perihal + isi terisi otomatis.

          S#424 — K-424-1 (Philips): kanal WA ditambahkan. WA = kanal KIRIM, email = kanal
          DOKUMENTASI & LOG. `wa.me` jalan di aplikasi ponsel, WhatsApp Desktop, DAN WhatsApp Web,
          jadi ia tidak bisa gagal senyap seperti `mailto:` saat tidak ada aplikasi email terdaftar
          (persis yang terjadi di jendela Incognito, bukti T-424-4).
        */}
        {/*
          AKSI UTAMA — S#424, keputusan Philips: support problem WAJIB lewat EMAIL demi audit trail
          + log history, supaya penyelesaian case tidak jadi subjektif karena kedekatan personal.
          Tombol ini mengirim lewat SERVER: laporan dicatat ke `app_error_log` LEBIH DULU, baru
          email dikirim ke kontak tim. Ia tidak menitipkan apa pun ke aplikasi email pengguna,
          sehingga tidak bisa gagal senyap seperti `mailto:` (terbukti T-424-4).

          Digerbangi `showContact` saja — SENGAJA tidak menunggu `mailtoHref`/`waHref`: laporan
          tetap masuk audit trail walau nol kontak dicentang.
        */}
        {data.showContact && (
          <LaporGangguanButton
            routePath="/"
            namaHalaman={data.title}
            area="publik"
            teksTombol={data.teksLapor.tombol}
            teksMengirim={data.teksLapor.mengirim}
            teksSukses={data.teksLapor.sukses}
            teksGagal={data.teksLapor.gagal}
          />
        )}

        {data.showContact && (data.mailtoHref || data.waHref) && (
          <div className="mt-4 space-y-1.5 text-xs opacity-70">
            {data.mailtoHref && (
              <p>
                <a
                  href={data.mailtoHref}
                  className="underline underline-offset-2 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
                >
                  {data.ctaText}
                </a>
              </p>
            )}

            {data.waHref && (
              <p>
                <a
                  href={data.waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
                >
                  {data.waCtaText}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
