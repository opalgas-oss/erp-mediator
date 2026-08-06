// app/dashboard/superadmin/uji-s443/[kasus]/page.tsx
// DUA HALAMAN UJI dalam SATU berkas ber-segmen dinamis — alat pembukti §10.1 butir (a)(b)(c)(d),
// ditetapkan K-436-3. Dibuat: Sesi #443.
//
// ⛔⛔ WAJIB DICABUT SESUDAH TC-MTC LULUS — berkas ini + folder `uji-s443/` dibuang BERSAMA, dalam
//   satu commit, di sesi yang menutup #45. Halaman uji yang tertinggal = hutang sesi berikutnya
//   (§10.1 VERBATIM).
//
// 🔴 KENAPA SEGMEN DINAMIS, BUKAN DUA FOLDER STATIS — DIKOREKSI DI S#443 SETELAH BUILD GAGAL.
//   Percobaan pertama menaruh `uji-s443/rusak/page.tsx` + `uji-s443/sehat/page.tsx`. `npm run
//   build` BERHENTI MERAH di `prebuild` — `lib/guards/menu-catalog.guard.test.ts` arah (b)
//   kode→DB: *setiap* page non-dinamis di bawah `app/dashboard/superadmin/**` WAJIB punya baris
//   `dashboard_menus`. Keduanya nol baris ⇒ `orphanPages` = 2 ⇒ GAGAL-MERAH. Guard itu BEKERJA
//   BENAR; yang keliru adalah penempatan halaman ujinya.
//   ⛔ Guard-nya TIDAK dilonggarkan dan TIDAK diberi pengecualian baru. Yang dipakai adalah
//   pengecualian yang SUDAH ADA sejak S#409 dan tertulis di kepala guard: segmen route DINAMIS
//   dikecualikan, karena route berparameter memang tidak bisa dipetakan 1:1 ke satu baris menu.
//   ⛔ Alternatif "daftarkan dua baris `dashboard_menus`" DITOLAK: itu menaruh data uji ke tabel
//   yang justru sedang dijaga, dan menyisakan risiko baris yatim kalau pencabutannya terlupa —
//   kelas #48 `TEMUAN-DASHBOARDMENUS-DRIFT` yang belum tuntas.
//
// ALAMAT TERSEMBUNYI (§10.1): nol baris `dashboard_menus`, nol tautan sidebar. Akibat yang
//   DIRANCANG: resolver §B1 jatuh ke langkah 5 dan memakai ALAMAT MENTAH sebagai nama halaman.
//   Itu BENAR, bukan TC gagal (kelas #77).
//
// ⛔ `force-dynamic` BUKAN hiasan — ia yang menjaga `next build` tetap hijau. Tanpanya Next.js
//   menyiapkan halaman ini saat build, lemparan `rusak` terjadi di sana, dan BUILD-nya yang gagal
//   alih-alih halamannya. Yang diuji adalah kegagalan saat PENGUNJUNG membuka halaman.
//
// ⚠️ Lemparan dari SERVER Component (bukan klien) SENGAJA: hanya jalur ini yang membuat Next.js
//   menerbitkan `digest` — kolom yang menyambungkan layar pengguna dengan baris `app_error_log`
//   (§7). Konsekuensinya `pesan` KOSONG di mode produksi karena Next.js menyembunyikan isi pesan
//   error server; itu perilaku yang benar, bukan kekurangan.

import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function HalamanUji({ params }: { params: Promise<{ kasus: string }> }) {
  const { kasus } = await params

  // ── /uji-s443/rusak — pembukti butir (a) + (b) + (d) ────────────────────────
  if (kasus === 'rusak') {
    throw new Error('UJI S#443 — kerusakan disengaja untuk membuktikan §10.1 butir (a), (b), dan (d).')
  }

  // ── /uji-s443/sehat — pembukti butir (c) ───────────────────────────────────
  // Halaman pembanding ini NOL config dibaca, NOL Supabase disentuh, NOL komponen bersama dipakai.
  // Kalau ia punya ketergantungan, kegagalannya akan terbaca sebagai bantahan atas butir (c)
  // padahal penyebabnya lain. Ia duduk di bawah penangkap `error.tsx` yang SAMA dengan `rusak`,
  // jadi kalau ia tetap normal sementara tetangganya menampilkan wajah Maintenance, terbukti
  // saklarnya adalah SAKLAR TAMPILAN per-halaman — bukan saklar tutup situs (K-436-1).
  if (kasus === 'sehat') {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">Halaman uji SEHAT — S#443</h1>
          <p className="text-sm leading-relaxed opacity-90">
            Kalau Anda melihat tulisan ini, halaman ini terbuka normal.
          </p>
          <p className="mt-5 text-sm leading-relaxed opacity-90">
            Ini yang wajib dibuktikan butir (c): halaman sehat tetap normal, apa pun posisi saklar
            Mode Maintenance — sementara tetangganya di <code>../rusak</code> menampilkan wajah
            Maintenance. Halaman ini dicabut sesudah TC lulus.
          </p>
        </div>
      </main>
    )
  }

  // Alamat lain di bawah `uji-s443/` bukan halaman uji. `notFound()` SENGAJA dipakai, bukan
  // lemparan: §5.0.4 menyatakan "alamat tidak ada" WAJIB jatuh ke halaman tidak-ditemukan,
  // BUKAN ke halaman Maintenance. Menguji itu gratis di sini.
  notFound()
}
