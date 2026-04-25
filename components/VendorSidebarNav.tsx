'use client'

// components/VendorSidebarNav.tsx
// Sidebar navigasi dashboard Vendor.
// Static menu — berbeda dari SidebarNav SA yang data-driven (config_registry).
// Alasan tidak reuse SidebarNav: routing SA ke /settings/{feature_key},
// Vendor ke halaman fitur statis — struktur fundamental berbeda (ATURAN 11).
//
// Menu sesuai VENDOR_DASHBOARD_SPEC_v1.md Bab 1.2:
//   Ringkasan, Order Masuk, Bidding Aktif, Order Dikerjakan,
//   History Transaksi, Produk, Edit Profil, Ganti Password
//
// Dibuat: Sesi #062 — samakan UI/UX Vendor dengan SA

import Link        from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, ShoppingBag, Clock,
  Package, History, Store, User, Lock,
  MapPin, X,
} from 'lucide-react'

// ─── Daftar menu vendor — urutan sesuai spec ─────────────────────────────────
const VENDOR_MENU = [
  { key: 'ringkasan',   label: 'Ringkasan',          href: '/dashboard/vendor',                  icon: LayoutDashboard },
  { key: 'order-masuk', label: 'Order Masuk',         href: '/dashboard/vendor/order-masuk',      icon: ShoppingBag     },
  { key: 'bidding',     label: 'Bidding Aktif',       href: '/dashboard/vendor/bidding-aktif',    icon: Clock           },
  { key: 'dikerjakan',  label: 'Order Dikerjakan',    href: '/dashboard/vendor/order-dikerjakan', icon: Package         },
  { key: 'produk',      label: 'Produk',              href: '/dashboard/vendor/produk',           icon: Store           },
  { key: 'history',     label: 'History Transaksi',   href: '/dashboard/vendor/history',          icon: History         },
  { key: 'profil',      label: 'Edit Profil',         href: '/dashboard/vendor/profil',           icon: User            },
  { key: 'password',    label: 'Ganti Password',      href: '/dashboard/vendor/ganti-password',   icon: Lock            },
] as const

interface VendorSidebarNavProps {
  brandName:     string
  messages:      Record<string, string>
  mobileOpen:    boolean
  onMobileClose: () => void
}

export function VendorSidebarNav({
  brandName, messages, mobileOpen, onMobileClose,
}: VendorSidebarNavProps) {
  const pathname = usePathname()
  const [gpsInfo, setGpsInfo] = useState({ kota: '', loginAt: '' })

  function m(key: string): string { return messages[key] ?? '' }

  useEffect(() => {
    function getCookie(name: string) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      return match ? decodeURIComponent(match[2]) : ''
    }
    const kota    = getCookie('gps_kota')
    const loginAt = getCookie('session_login_at')
    let waktu = ''
    if (loginAt) {
      try { waktu = new Date(loginAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
      catch { /* skip */ }
    }
    setGpsInfo({ kota: kota || 'Tidak Diketahui', loginAt: waktu })
  }, [])

  return (
    <aside className={[
      'bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden shrink-0',
      'transition-transform duration-300',
      'fixed inset-y-0 left-0 z-50 w-64',
      mobileOpen ? 'translate-x-0' : '-translate-x-full',
      'md:static md:translate-x-0 md:w-[52px] md:z-auto',
      'lg:w-64',
    ].join(' ')}>

      {/* ─── Header Sidebar ─────────────────────────────────────────────────── */}
      <div className="h-14 border-b border-slate-200 shrink-0 flex items-center px-6 md:justify-center md:px-0 lg:justify-start lg:px-6">
        <div className="flex-1 md:hidden lg:block">
          <p className="text-sm font-bold text-slate-900 leading-tight">{brandName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{m('sidebar_brand_sublabel') || 'Vendor Dashboard'}</p>
        </div>
        <div className="hidden md:flex lg:hidden items-center justify-center w-8 h-8">
          <Store size={18} className="text-slate-400" />
        </div>
        <button onClick={onMobileClose}
          className="md:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          aria-label="Tutup sidebar">
          <X size={16} />
        </button>
      </div>

      {/* ─── Navigasi ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col md:px-0 md:items-center lg:px-2 lg:items-stretch gap-0.5">
        {VENDOR_MENU.map(({ key, label, href, icon: Icon }) => {
          const aktif = pathname === href || (href !== '/dashboard/vendor' && pathname.startsWith(href))
          return (
            <Link key={key} href={href} prefetch={false}
              title={label}
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                'md:justify-center md:px-0 md:w-[36px] md:h-[36px] lg:justify-start lg:px-3 lg:w-full lg:h-auto',
                aktif
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
              ].join(' ')}>
              <Icon size={15} className="shrink-0" />
              <span className="md:hidden lg:inline whitespace-nowrap">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ─── Info GPS ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-slate-100 shrink-0 md:hidden lg:flex">
        <div className="flex items-start gap-1.5 w-full">
          <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-slate-500 leading-tight">{gpsInfo.kota}</p>
            {gpsInfo.loginAt && (
              <p className="text-xs text-slate-400 leading-tight mt-0.5">
                Login {gpsInfo.loginAt}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
