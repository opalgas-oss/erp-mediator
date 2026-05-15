// middleware.ts — letaknya di ROOT folder, sejajar dengan folder app/
// Berjalan di Edge Runtime — tidak boleh import library Node.js
//
// [ISI ASLI SEBELUM FIX B1-04 — lihat middleware.ts.note untuk keterangan]
// File snapshot ini disimpan agar dapat rollback presisi jika diperlukan.
//
// Perubahan B1-04 yang dilakukan di file asli:
//   1. Tambah import VENDOR_LOGIN_ALLOWED dari '@/lib/constants'
//   2. Tambah guard vendor status check setelah if (!userRole || !userId) block
//      Lokasi: sebelum // ── Propagasi user data ke Server Components via request headers ──────
