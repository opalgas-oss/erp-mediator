'use client'

// components/SidebarNav.tsx
// Sidebar navigasi dashboard SuperAdmin.
// Data-driven: label menu dari message_library, daftar menu dari config_registry feature_key.
// Responsive:
//   Mobile  (<md, <768px)  : hidden default → fixed overlay saat mobileOpen
//   Tablet  (md–lg)        : icon-only 52px, label + sub-menu tersembunyi
//   Desktop (lg+, ≥1024px) : full 256px dengan label dan sub-menu
//
// REFACTOR Sesi #079 — DRY fix (BLOK B):
//   - Hapus inline getCookie → import dari lib/utils-client
//   - Hapus inline interpolate → import dari lib/utils-client
//   - Hapus GPS useEffect → pakai useGpsInfo hook dari lib/hooks/useGpsInfo
//   - Hapus prop mobileOpen + onMobileClose → pakai useMobileSidebar() context

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect }   from 'react'
import { Settings, BookText, MapPin, X } from 'lucide-react'
import { interpolate }           from '@/lib/utils-client'
import { useGpsInfo }            from '@/lib/hooks/useGpsInfo'
import { useMobileSidebar }      from '@/components/DashboardShell'

// ─── Nav Position — urutan sidebar didefinisikan di KODE, bukan di DB ────────
// Pola: WooCommerce-style numeric position (float-friendly untuk sisipan).
const NAV_POSITION: Record<string, number> = {
  security_login:    10,
  multi_role_policy: 15,  // PL-S08 M1 — ditambah S#098
  register_user:     20,
  register_vendor:   30,
  order_form:        40,
  bidding_vendor:    50,
  payment:           60,
  branding:          70,
  pesan:             80,
  sistem:            90,
  pilihan_opsi:     100,
}

// ─── URL derivation dari feature_key ─────────────────────────────────────────
function featureKeyToPath(key: string): string {
  return `/dashboard/superadmin/settings/${key.replace(/_/g, '-')}`
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarNavProps {
  brandName:   string                  // dari tenants.nama_brand
  messages:    Record<string, string>  // dari message_library kategori sidebar_ui
  featureKeys: string[]                // distinct feature_key dari config_registry
}

export function SidebarNav({ brandName, messages, featureKeys }: SidebarNavProps) {
  const pathname = usePathname()
  const router   = useRouter()

  // Mobile state dari DashboardShell context — tidak perlu prop drilling
  const { mobileOpen, onMobileClose } = useMobileSidebar()

  const [open, setOpen] = useState(() => pathname.includes('/settings'))

  // GPS info dari shared hook — menggantikan inline useEffect + getCookie
  const gpsInfo = useGpsInfo(m('sidebar_gps_kota_fallback'))

  function m(key: string, vars?: Record<string, string>): string {
    const teks = messages[key] ?? key
    return vars ? interpolate(teks, vars) : teks
  }

  useEffect(() => {
    if (pathname.includes('/settings')) setOpen(true)
  }, [pathname])

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
        <div className="flex-1 md:hidden lg:block">
          <p className="text-sm font-bold text-slate-900 leading-tight">{brandName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{m('sidebar_brand_sublabel')}</p>
        </div>
        <div className="hidden md:flex lg:hidden items-center justify-center w-8 h-8">
          <Settings size={18} className="text-slate-400" />
        </div>
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
