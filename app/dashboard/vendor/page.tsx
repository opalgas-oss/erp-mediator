// app/dashboard/vendor/page.tsx
// Halaman utama Dashboard Vendor — Sprint 3
//
// Saat ini: placeholder konfirmasi login berhasil
// Sprint 3: akan diisi dengan fitur Vendor Store, order list, dll.
//
// Layout sudah verifikasi JWT dan role === 'VENDOR'
// Page ini tidak perlu verifikasi ulang.

export default function VendorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center">
      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-6 h-6 text-green-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
          />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Dashboard Vendor</h1>
      <p className="text-sm text-gray-400">
        Login berhasil. Fitur Vendor Store akan tersedia di Sprint 3.
      </p>
    </div>
  )
}
