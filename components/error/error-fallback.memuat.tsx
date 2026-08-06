// components/error/error-fallback.memuat.tsx
// WAJAH "SEDANG MEMBACA" untuk halaman yang gagal dibuka — dipakai HANYA oleh `ErrorFallbackView`
// selama isi dari panel SA belum kembali. Lahir: Sesi #446, menutup #80.
//
// KENAPA BERKAS INI ADA (bukan kerapian — ini koreksi terhadap §5.0.6):
//   §5.0.6 mengizinkan teks cadangan di dalam kode "dipakai HANYA bila isi dari panel SA GAGAL
//   dibaca". Kode S#439 memakainya juga saat isi itu BELUM SELESAI dibaca (`config ?? CONFIG_CADANGAN`)
//   — dua keadaan yang berbeda diberi satu wajah. Akibatnya pengunjung melihat judul, tema, dan
//   ilustrasi BERGANTI di depan matanya (#80, ditemukan MATA Philips S#445).
//   Keadaan GAGAL sudah punya penawarnya sendiri satu lapis lebih dalam: `bacaMaintenanceConfigKlien()`
//   TIDAK PERNAH melempar dan sudah memulangkan seluruh medan `MAINTENANCE_CADANGAN` saat kedua
//   `fetch`-nya gagal. Jadi berkas ini hanya mengisi keadaan MEMBACA — nol perlindungan §5.0.6 hilang.
//
// KENAPA PUNYA RUMAH SENDIRI (ALASAN BERUBAH, ATURAN 50.5 / 54.4 — sumbu yang SAMA dengan rumpun
//   `maintenance-view.*`): berkas ini berubah kalau BENTUK keadaan-membaca berubah; `ErrorFallbackView`
//   berubah kalau ALUR penangkap kegagalan berubah. Pemicunya juga diukur: `ErrorFallbackView`
//   7.454 B = sisa 738 B ke ambang tindakan 8.192 B (K-429-1) — menaruhnya di sana menjebol ambang.

/**
 * Jeda sebelum kerangka ditampilkan. Di bawah jeda ini layar sengaja DIBIARKAN KOSONG: pada jalur
 * hangat kedua `fetch` kembali lebih cepat dari ini, sehingga yang pertama dilihat pengunjung
 * langsung wajah NYATA — nol kedipan. Angka 500 ms mengikuti acuan matang eBay Design System (*"skeletons should only be used
 * for loads that take 500ms or longer"*) dan batas 1 detik Nielsen (alur pikir pengguna belum terputus).
 */
export const JEDA_MS_MEMUAT = 500

/** Kerangka NETRAL — nol judul, nol tema, nol ilustrasi, nol tombol. Ia tidak menyerupai wajah mana pun. */
export function ErrorFallbackMemuat() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex-1 w-full flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <div className="h-24 w-24 rounded-full bg-black/5 animate-pulse" />
        <div className="h-6  w-3/5 rounded bg-black/5 animate-pulse" />
        <div className="h-4  w-full rounded bg-black/5 animate-pulse" />
        <div className="h-4  w-4/5  rounded bg-black/5 animate-pulse" />
      </div>
    </main>
  )
}
