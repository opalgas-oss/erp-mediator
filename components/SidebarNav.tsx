'use client'

// components/SidebarNav.tsx
// Sidebar navigasi dashboard SuperAdmin.
// Data-driven: label menu dari message_library, daftar menu dari config_registry feature_key.
// Responsive:
//   Mobile  (<md, <768px)  : hidden default → fixed overlay saat mobileOpen
//   Tablet  (md–lg)        : icon-only 52px, label + sub-menu tersembunyi
//   Desktop (lg+, ≥1024px) : full 256px dengan label dan sub-menu

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Settings, MapPin, X } from 'lucide-react'

// ─── Nav Position — urutan sidebar didefinisikan di KODE, bukan di DB ────────
// Pola: WooCommerce-style numeric position (float-friendly untuk sisipan).
// Untuk tambah item baru: pakai angka di antara nilai yang ada (misal 25 untuk
// posisi antara register_user:20 dan register_vendor:30) — tanpa ubah nilai lain.
// feature_key yang TIDAK ada di sini tidak akan tampil di sidebar.
const NAV_POSITION: Record<string, number> = {
  security_login:   10,
  register_user:    20,
  register_vendor:  30,
  order_form:       40,
  bidding_vendor:   50,
  payment:          60,
  branding:         70,
  pesan:            80,
  sistem:           90,
  pilihan_opsi:    100,
}

// ─── URL derivation dari feature_key — TIDAK disimpan di DB ──────────────────
// Pola: feature_key → kebab-case slug → path URL
// Contoh: security_login → security-login → /dashboard/superadmin/settings/security-login
function featureKeyToPath(key: string): string {
  return `/dashboard/superadmin/settings/${key.replace(/_/g, '-')}`
}

// ─── Interpolate teks lokal — tidak import server-only lib ───────────────────
function interpolate(teks: string, vars: Record<string, string>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarNavProps {
  brandName:     string                  // dari tenants.nama_brand
  messages:      Record<string, string>  // dari message_library kategori sidebar_ui
  featureKeys:   string[]                // distinct feature_key dari config_registry
  mobileOpen:    boolean                 // dikontrol DashboardShell
  onMobileClose: () => void              // callback tutup sidebar mobile
}

export function SidebarNav({
  brandName,
  messages,
  featureKeys,
  mobileOpen,
  onMobileClose,
}: SidebarNavProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const [open, setOpen] = useState(() => pathname.includes('/settings'))
  const [gpsInfo, setGpsInfo] = useState({ kota: '', loginAt: '' })

  function m(key: string, vars?: Record<string, string>): string {
    const teks = messages[key] ?? key
    return vars ? interpolate(teks, vars) : teks
  }

  useEffect(() => {
    if (pathname.includes('/settings')) setOpen(true)
  }, [pathname])

  useEffect(() => {
    function getCookie(name: string) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      return match ? decodeURIComponent(match[2]) : ''
    }
    const kota    = getCookie('gps_kota')
    const loginAt = getCookie('session_login_at')
    let waktu = ''
    if (loginAt) {
      try {
        waktu = new Date(loginAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      } catch { /* skip */ }
    }
    setGpsInfo({
      kota:    kota || m('sidebar_gps_kota_fallback'),
      loginAt: waktu,
    })
  }, [messages])

  const sortedNavItems = featureKeys
    .filter(k => k in NAV_POSITION)
    .sort((a, b) => (NAV_POSITION[a] ?? 999) - (NAV_POSITION[b] ?? 999))

  function handleKonfigurasiClick() {
    if (open && pathname.includes('/settings')) {
      setOpen(false)
      router.push('/dashboard/superadmin')
    } else {
      setOpen(prev => !prev)
    }
  }

  return (
    <aside
      className={[
        'bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden shrink-0',
        'transition-transform duration-300',
        'fixed inset-y-0 left-0 z-50 w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'md:static md:translate-x-0 md:w-[52px] md:z-auto',
        'lg:w-64',
      ].join(' ')}
    >

      {/* ─── Header Sidebar — h-14 sama tinggi dengan DashboardHeader ────────── */}
      <div className="h-14 border-b border-slate-200 shrink-0 flex items-center px-6 md:justify-center md:px-0 lg:justify-start lg:px-6">

        {/* Nama brand + sublabel — tersembunyi di tablet */}
        <div className="flex-1 md:hidden lg:block">
          <p className="text-sm font-bold text-slate-900 leading-tight">{brandName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{m('sidebar_brand_sublabel')}</p>
        </div>

        {/* Icon placeholder tablet (icon-only mode) */}
        <div className="hidden md:flex lg:hidden items-center justify-center w-8 h-8">
          <Settings size={18} className="text-slate-400" />
        </div>

        {/* Tombol tutup — mobile only */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          aria-label="Tutup sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* ─── Navigasi ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col md:px-0 md:items-center lg:px-2 lg:items-stretch">

        <button
          onClick={handleKonfigurasiClick}
          title={m('sidebar_menu_konfigurasi')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-blue-700 hover:bg-slate-100 transition-colors md:justify-center md:px-0 md:w-[36px] md:h-[36px] lg:justify-start lg:px-3 lg:w-full lg:h-auto"
        >
          <Settings size={15} className="shrink-0 opacity-70" />
          <span className="md:hidden lg:inline">{m('sidebar_menu_konfigurasi')}</span>
          <span
            className="ml-auto text-xs text-slate-400 transition-transform duration-200 md:hidden lg:inline-block"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▼
          </span>
        </button>

        {/* Sub-menu — tersembunyi di tablet */}
        {open && (
          <div className="mt-0.5 md:hidden lg:block">
            {sortedNavItems.map((key) => (
              <Link
                key={key}
                href={featureKeyToPath(key)}
                prefetch={false}
                className={`block py-1.5 pl-9 pr-3 text-xs rounded-md my-px transition-colors whitespace-nowrap ${
                  pathname === featureKeyToPath(key)
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {m(`nav_menu_${key}`)}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* ─── Info GPS — tersembunyi di tablet ───────────────────────────────── */}
      <div className="px-4 py-3 border-t border-slate-100 shrink-0 md:hidden lg:flex">
        <div className="flex items-start gap-1.5 w-full">
          <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-slate-500 leading-tight">{gpsInfo.kota}</p>
            {gpsInfo.loginAt && (
              <p className="text-xs text-slate-400 leading-tight mt-0.5">
                {m('sidebar_gps_login_prefix', { waktu: gpsInfo.loginAt })}
              </p>
            )}
          </div>
        </div>
      </div>

    </aside>
  )
}
