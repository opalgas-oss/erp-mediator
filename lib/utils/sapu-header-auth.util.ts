// lib/utils/sapu-header-auth.util.ts
// Sapuan header auth kiriman luar. Dibuat: Sesi #494 — hutang #129.
//
// 🔴 KENAPA IA TINGGAL DI BERKAS SENDIRI, BUKAN DI `middleware.ts`:
//   `middleware.ts` terukur 26.297 B = 256,8% plafon kode 10.240 B — warisan yang jauh di atas
//   plafon. ATURAN 53.1 melarang menambah isi ke berkas yang sudah lewat ambang tanpa alasan
//   yang diukur. Bagian yang MURNI (nol `next/server`, nol Supabase) karena itu dikeluarkan ke
//   sini: ia bisa diuji tanpa menyalakan server, dan induknya tidak bertambah gemuk.
// ⛔ MURNI — nol impor. Ia dipanggil dari middleware yang berjalan di edge runtime.

/**
 * Header auth yang middleware SUNTIKKAN SENDIRI sesudah memverifikasi sesi.
 * 🔴 RUMAH TUNGGALNYA DI SINI (ATURAN 36). Sebelum S#494 daftar ini hidup DUA KALI di
 *   `middleware.ts` — sekali di Guard 5, sekali di Guard 6 — dan keduanya sudah melenceng:
 *   Guard 5 menyapu `x-vendor-status`, Guard 6 tidak.
 */
export const HEADER_AUTH_DISUNTIK = [
  'x-user-id',
  'x-user-role',
  'x-tenant-id',
  'x-user-display-name',
  'x-user-memberships',
  'x-is-super-admin',
  'x-vendor-status',
] as const

/**
 * Salinan header permintaan TANPA satu pun header auth kiriman luar.
 *
 * 🔴 SEBAB IA ADA — hutang #129, lahir dari E-493-1. Sebelum S#494, penghapusan header hanya
 *   terjadi DI DALAM Guard 6 (empat prefiks API) dan Guard 5 (`/dashboard`). Path di luar
 *   keduanya meneruskan `x-is-super-admin` apa adanya dari siapa pun ke penanganan rutenya,
 *   sedangkan `requireSuperAdmin()` memercayai header itu tanpa memverifikasinya.
 * ⚠️ PERMUKAAN YANG TERPAPAR HARI INI NOL — ketiga rute yang dulu memercayainya sudah pindah ke
 *   `requireSuperAdminCookie()` di S#493, dan itu diuji: permintaan anonim (`credentials:'omit'`)
 *   dijawab 401. Yang ditutup di sini adalah rute SA BERIKUTNYA. Daftar prefiks adalah daftar
 *   yang harus diingat, dan yang harus diingat pasti terlupa — itu sebabnya penggantinya bukan
 *   "tambah satu prefiks" (K-493-T13 sudah menolak itu) melainkan sapuan untuk SELURUH path.
 * ⛔ Header asli TIDAK diubah: `Headers` permintaan bersifat baca-saja di middleware Next.js,
 *   jadi yang dipulangkan adalah SALINAN yang kemudian diteruskan lewat
 *   `NextResponse.next({ request: { headers } })`.
 */
export function sapuHeaderAuth(asal: Headers): Headers {
  const bersih = new Headers(asal)
  for (const nama of HEADER_AUTH_DISUNTIK) bersih.delete(nama)
  return bersih
}
