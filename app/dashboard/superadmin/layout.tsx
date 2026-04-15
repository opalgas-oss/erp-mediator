// app/dashboard/superadmin/layout.tsx
// Layout utama SuperAdmin — Server Component
// Struktur: sidebar kiri (navigasi) + area konten kanan
// Proteksi: cek JWT dari cookie via verifyJWT() — redirect /login jika bukan SUPERADMIN

import { redirect }  from 'next/navigation'
import Link          from 'next/link'
import { verifyJWT } from '@/lib/auth-server'

// ─── Label Teks ───────────────────────────────────────────────────────────────
// Semua teks UI dalam Bahasa Indonesia — ubah di sini untuk ganti label tampilan
const LABEL_NAMA_PLATFORM     = 'ERP Mediator'
const LABEL_NAMA_PANEL        = 'SuperAdmin Panel'
const LABEL_MENU_KONFIGURASI  = 'Konfigurasi'

// ─── Item Menu Sidebar ────────────────────────────────────────────────────────
// Tambah item baru di sini — tidak perlu ubah JSX
const MENU_SIDEBAR: { label: string; href: string }[] = [
  { label: LABEL_MENU_KONFIGURASI, href: '/dashboard/superadmin/settings/config' },
]

// ─── Layout ───────────────────────────────────────────────────────────────────
export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verifikasi JWT dari cookie 'session'
  // Jika token tidak ada, tidak valid, atau role bukan SUPERADMIN → redirect ke login
  const payload = await verifyJWT()

  if (!payload || payload.role !== 'SUPERADMIN') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sidebar kiri ──────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">

        {/* Header: logo platform + nama panel */}
        <div className="px-6 py-5 border-b border-gray-200">
          <p className="text-base font-bold text-gray-900 leading-tight">
            {LABEL_NAMA_PLATFORM}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {LABEL_NAMA_PANEL}
          </p>
        </div>

        {/* Menu navigasi */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {MENU_SIDEBAR.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
        </nav>

      </aside>

      {/* ── Area konten kanan ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>

    </div>
  )
}
