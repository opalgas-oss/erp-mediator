// app/dashboard/vendor/[...slug]/page.tsx
// Catch-all route untuk halaman Vendor yang belum dibangun.
// Menangkap semua path /dashboard/vendor/* yang tidak punya page.tsx sendiri.
//
// Tujuan: mencegah Next.js menampilkan 404 global (tanpa shell) saat vendor
// mengklik menu yang belum tersedia. Sidebar dan header tetap tampil
// karena page ini masih dalam vendor layout.tsx.
//
// Dibuat: Sesi #079 — perbaikan UX berdasarkan feedback C3

export default function VendorPageBelumTersedia() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">
        Halaman Belum Tersedia
      </h2>
      <p className="text-sm text-slate-400 max-w-xs">
        Fitur ini sedang dalam pengembangan dan akan segera hadir.
      </p>
    </div>
  )
}
