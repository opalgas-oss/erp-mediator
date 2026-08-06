// app/dashboard/superadmin/uji-s443/sehat/page.tsx
// HALAMAN UJI — SENGAJA SEHAT. Alat pembukti butir (c) §10.1 (K-436-3).
// Dibuat: Sesi #443.
//
// ⛔⛔ WAJIB DICABUT SESUDAH TC-MTC LULUS — bersama `../rusak/page.tsx` dan folder `uji-s443/`.
//
// KENAPA HALAMAN YANG TIDAK RUSAK PERLU DIBUAT. Butir (c) menuntut bukti bahwa halaman SEHAT
//   TETAP NORMAL di KEDUA posisi saklar. Itu tidak bisa dibuktikan oleh halaman yang rusak, dan
//   tidak bisa dibuktikan meyakinkan oleh halaman produksi mana pun — kalau halaman produksi
//   tetap normal, selalu tersisa bantahan "mungkin saklarnya memang tidak menyentuh halaman itu".
//   Halaman ini duduk PERSIS BERSEBELAHAN dengan yang rusak, di bawah penangkap `error.tsx` yang
//   SAMA. Kalau ia tetap normal sementara tetangganya menampilkan wajah Maintenance, terbukti
//   saklarnya adalah SAKLAR TAMPILAN per-halaman — bukan saklar tutup situs (K-436-1).
//
// ⛔ NOL config dibaca, NOL Supabase disentuh, NOL komponen bersama dipakai. Halaman pembanding
//   harus mustahil ikut rusak oleh sebab yang sama; kalau ia punya ketergantungan, kegagalannya
//   akan terbaca sebagai bantahan atas butir (c) padahal penyebabnya lain.

export const dynamic = 'force-dynamic'

export default function HalamanUjiSehat() {
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
