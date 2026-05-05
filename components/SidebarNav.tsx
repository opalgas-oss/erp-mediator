'use client'

// components/SidebarNav.tsx
// Sidebar navigasi dashboard SuperAdmin.
// Data-driven: label menu dari message_library, struktur menu dari nav.constant.
//
// REFACTOR Sesi #100 — Sentralisasi UI:
//   - Icon diambil dari ICON_NAV (icons.constant) — tidak ada import lucide langsung
//   - Struktur menu dari SA_NAV_GROUPS (nav.constant)
//   - CSS class dari NAV_CLS (ui-tokens.constant)

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect }    from 'react'
import { interpolate }            from '@/lib/utils-client'
import { useGpsInfo }             from '@/lib/hooks/useGpsInfo'
import { useMobileSidebar }       from '@/components/DashboardShell'
import {
  SA_NAV_GROUPS,
  SA_VALID_FEATURE_KEYS,
  navItemToPath,
}                                 from '@/lib/constants/nav.constant'
import { NAV_CLS }                from '@/lib/constants/ui-tokens.constant'
import {
  ICON_NAV,
  ICON_ACTION,
}                                 from '@/lib/constants/icons.constant'

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

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of SA_NAV_GROUPS) {
      init[g.key] = isGroupActive(g.key, pathname)
    }
    return init
  })

  const gpsInfo = useGpsInfo(m('sidebar_gps_kota_fallback'))

  function m(key: string, vars?: Record<string, string>): string {
    const teks = messages[key] ?? key
    return vars ? interpolate(teks, vars) : teks
  }

  function isGroupActive(groupKey: string, path: string): boolean {
    if (groupKey === 'konfigurasi') return path.includes('/settings')
    if (groupKey === 'konten')      return path.includes('/messages')
    return false
  }

  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev }
      for (const g of SA_NAV_GROUPS) {
        if (isGroupActive(g.key, pathname)) next[g.key] = true
      }
      return next
    })
  }, [pathname])

  function handleGroupClick(groupKey: string) {
    const isActive = isGroupActive(groupKey, pathname)
    const isOpen   = openGroups[groupKey]
    if (isOpen && isActive) {
      setOpenGroups(prev => ({ ...prev, [groupKey]: false }))
      router.push('/dashboard/superadmin')
    } else {
      setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))
    }
  }

  const validFeatureKeys = new Set(featureKeys.filter(k => SA_VALID_FEATURE_KEYS.has(k)))

  // Icon untuk mode tablet (icon-only) — representasi SA dashboard
  const TabletIcon = ICON_NAV.konfigurasi

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
        {/* Tablet icon-only — dari ICON_NAV registry */}
        <div className="hidden md:flex lg:hidden items-center justify-center w-8 h-8">
          <TabletIcon size={17} className="text-slate-400" />
        </div>
        {/* Tutup sidebar mobile — dari ICON_NAV registry */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          aria-label="Tutup sidebar"
        >
          <ICON_NAV.close size={16} />
        </button>
      </div>

      {/* ─── Navigasi ─────────────────────────────────────────────────────────── */}
      <nav className={NAV_CLS.nav}>

        {SA_NAV_GROUPS.map(group => {
          const Icon     = group.icon   // dari ICON_NAV via nav.constant
          const isActive = isGroupActive(group.key, pathname)
          const isOpen   = openGroups[group.key] ?? false

          const subItems = group.key === 'konfigurasi'
            ? group.items
                .filter(item => validFeatureKeys.has(item.key))
                .sort((a, b) =>
                  group.items.findIndex(x => x.key === a.key) -
                  group.items.findIndex(x => x.key === b.key)
                )
            : group.items

          return (
            <div key={group.key}>
              <button
                onClick={() => handleGroupClick(group.key)}
                title={m(group.labelKey)}
                className={[
                  NAV_CLS.parentBase,
                  isActive ? NAV_CLS.parentActive : NAV_CLS.parentInactive,
                ].join(' ')}
              >
                <Icon size={group.iconSize} className="shrink-0" />
                <span className="md:hidden lg:inline">{m(group.labelKey)}</span>
                {/* ChevronDown dari ICON_NAV registry */}
                <ICON_NAV.chevronDown
                  size={13}
                  className={[
                    NAV_CLS.chevron,
                    isOpen ? NAV_CLS.chevronOpen : '',
                  ].join(' ')}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 mb-1 md:hidden lg:block">
                  {subItems.map(item => {
                    const href       = navItemToPath(item)
                    const itemActive = pathname === href
                    return (
                      <Link
                        key={item.key}
                        href={href}
                        prefetch={false}
                        className={[
                          NAV_CLS.subBase,
                          itemActive ? NAV_CLS.subActive : NAV_CLS.subInactive,
                        ].join(' ')}
                      >
                        {m(item.labelKey)}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

      </nav>

      {/* ─── Info GPS ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-slate-100 shrink-0 md:hidden lg:flex">
        <div className="flex items-start gap-1.5 w-full">
          {/* GPS pin icon dari ICON_NAV registry */}
          <ICON_NAV.gps size={12} className="text-slate-400 shrink-0 mt-0.5" />
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
