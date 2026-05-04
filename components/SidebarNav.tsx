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
//
// UPDATE Sesi #099 — PL-S08 M2 UI Fix (Opsi B):
//   - Konfigurasi + Konten keduanya collapsible button (setara hierarki)
//   - Icon: SlidersHorizontal (Konfigurasi) + Layers (Konten) — enterprise grade
//   - Sub-menu tanpa icon, cukup indent — standar Vercel/Notion/Linear/Supabase
//   - Font konsisten: parent font-medium slate-600 inactive → biru + bg active
//   - ChevronDown menggantikan karakter ▼ — lebih clean dan skalabel
//   - Hapus section label static "KONTEN" → diganti parent button

import Link from 'next/link'
import { usePathname, useRouter }    from 'next/navigation'
import { useState, useEffect }       from 'react'
import { SlidersHorizontal, Layers, MapPin, X, ChevronDown } from 'lucide-react'
import { interpolate }               from '@/lib/utils-client'
import { useGpsInfo }                from '@/lib/hooks/useGpsInfo'
import { useMobileSidebar }          from '@/components/DashboardShell'

// ─── Nav Position — urutan sidebar didefinisikan di KODE, bukan di DB ────────
const NAV_POSITION: Record<string, number> = {
  security_login:    10,
  multi_role_policy: 15,
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

function featureKeyToPath(key: string): string {
  return `/dashboard/superadmin/settings/${key.replace(/_/g, '-')}`
}

// ─── Shared class strings — satu definisi, dipakai konsisten ─────────────────
const CLS_PARENT_BASE =
  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ' +
  'transition-colors md:justify-center md:px-0 md:w-[36px] md:h-[36px] ' +
  'lg:justify-start lg:px-3 lg:w-full lg:h-auto'
const CLS_PARENT_INACTIVE = 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
const CLS_PARENT_ACTIVE   = 'bg-blue-50 text-blue-700'

const CLS_SUB_BASE     = 'block py-1.5 pl-9 pr-3 text-xs rounded-md my-px transition-colors whitespace-nowrap'
const CLS_SUB_ACTIVE   = 'bg-blue-50 text-blue-700 font-medium'
const CLS_SUB_INACTIVE = 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarNavProps {
  brandName:   string
  messages:    Record<string, string>
  featureKeys: string[]
}

export function SidebarNav({ brandName, messages, featureKeys }: SidebarNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { mobileOpen, onMobileClose } = useMobileSidebar()

  const isActiveSettings = pathname.includes('/settings')
  const isActiveMessages = pathname === '/dashboard/superadmin/messages'

  const [openConfig, setOpenConfig] = useState(() => isActiveSettings)
  const [openKonten, setOpenKonten] = useState(() => isActiveMessages)

  const gpsInfo = useGpsInfo(m('sidebar_gps_kota_fallback'))

  function m(key: string, vars?: Record<string, string>): string {
    const teks = messages[key] ?? key
    return vars ? interpolate(teks, vars) : teks
  }

  useEffect(() => {
    if (pathname.includes('/settings'))                          setOpenConfig(true)
    if (pathname === '/dashboard/superadmin/messages')           setOpenKonten(true)
  }, [pathname])

  const sortedNavItems = featureKeys
    .filter(k => k in NAV_POSITION)
    .sort((a, b) => (NAV_POSITION[a] ?? 999) - (NAV_POSITION[b] ?? 999))

  function handleConfigClick() {
    if (openConfig && isActiveSettings) {
      setOpenConfig(false)
      router.push('/dashboard/superadmin')
    } else {
      setOpenConfig(prev => !prev)
    }
  }

  function handleKontenClick() {
    setOpenKonten(prev => !prev)
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

      {/* ─── Header Sidebar ───────────────────────────────────────────────────── */}
      <div className="h-14 border-b border-slate-200 shrink-0 flex items-center px-6 md:justify-center md:px-0 lg:justify-start lg:px-6">
        <div className="flex-1 md:hidden lg:block">
          <p className="text-sm font-bold text-slate-900 leading-tight">{brandName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{m('sidebar_brand_sublabel')}</p>
        </div>
        <div className="hidden md:flex lg:hidden items-center justify-center w-8 h-8">
          <SlidersHorizontal size={17} className="text-slate-400" />
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          aria-label="Tutup sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* ─── Navigasi ─────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col gap-0.5 md:px-0 md:items-center lg:px-2 lg:items-stretch">

        {/* ── KONFIGURASI — collapsible ── */}
        <button
          onClick={handleConfigClick}
          title={m('sidebar_menu_konfigurasi')}
          className={[
            CLS_PARENT_BASE,
            isActiveSettings ? CLS_PARENT_ACTIVE : CLS_PARENT_INACTIVE,
          ].join(' ')}
        >
          <SlidersHorizontal size={15} className="shrink-0" />
          <span className="md:hidden lg:inline">{m('sidebar_menu_konfigurasi')}</span>
          <ChevronDown
            size={13}
            className={[
              'ml-auto shrink-0 transition-transform duration-200 md:hidden lg:block',
              openConfig ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {openConfig && (
          <div className="mt-0.5 mb-1 md:hidden lg:block">
            {sortedNavItems.map(key => (
              <Link
                key={key}
                href={featureKeyToPath(key)}
                prefetch={false}
                className={[
                  CLS_SUB_BASE,
                  pathname === featureKeyToPath(key) ? CLS_SUB_ACTIVE : CLS_SUB_INACTIVE,
                ].join(' ')}
              >
                {m(`nav_menu_${key}`)}
              </Link>
            ))}
          </div>
        )}

        {/* ── KONTEN — collapsible, setara Konfigurasi ── */}
        <button
          onClick={handleKontenClick}
          title={m('sidebar_menu_konten') || 'Konten'}
          className={[
            CLS_PARENT_BASE,
            isActiveMessages ? CLS_PARENT_ACTIVE : CLS_PARENT_INACTIVE,
          ].join(' ')}
        >
          <Layers size={15} className="shrink-0" />
          <span className="md:hidden lg:inline">{m('sidebar_menu_konten') || 'Konten'}</span>
          <ChevronDown
            size={13}
            className={[
              'ml-auto shrink-0 transition-transform duration-200 md:hidden lg:block',
              openKonten ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {openKonten && (
          <div className="mt-0.5 md:hidden lg:block">
            <Link
              href="/dashboard/superadmin/messages"
              prefetch={false}
              className={[
                CLS_SUB_BASE,
                isActiveMessages ? CLS_SUB_ACTIVE : CLS_SUB_INACTIVE,
              ].join(' ')}
            >
              {m('nav_menu_messages')}
            </Link>
          </div>
        )}

      </nav>

      {/* ─── Info GPS ─────────────────────────────────────────────────────────── */}
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
