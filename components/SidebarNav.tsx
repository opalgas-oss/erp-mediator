'use client'

// components/SidebarNav.tsx
// Sidebar navigasi dashboard SuperAdmin.
// Data-driven: label menu dari message_library, struktur menu dari nav.constant.
//
// REFACTOR Sesi #100 — Sentralisasi UI:
//   - Icon diambil dari ICON_NAV (icons.constant) — tidak ada import lucide langsung
//   - Struktur menu dari SA_NAV_GROUPS (nav.constant)
//   - CSS class dari NAV_CLS (ui-tokens.constant)
// Updated Sesi #135: tambah isGroupActive case 'pengguna' (M7 Roles & Permissions)
// Updated Sesi #136: tambah /memberships ke isGroupActive case 'pengguna' (M8)
// Updated Sesi #137: tambah /refunds ke isGroupActive case 'pengguna' (M9)
// Updated Sesi #144: tambah /wilayah ke isGroupActive case 'manajemen' (Master Wilayah)

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect }    from 'react'
import { interpolate }            from '@/lib/utils-client'
import { useGpsInfo }             from '@/lib/hooks/useGpsInfo'
import { useMobileSidebar }       from '@/components/DashboardShell'
import {
  SA_NAV_GROUPS,        // @DEPRECATED S#255 — dipakai sebagai fallback + guard KNOWN_MENU_KEYS
  SA_VALID_FEATURE_KEYS,
  navItemToPath,
  warnUnknownMenuKeys,
}                                 from '@/lib/constants/nav.constant'
import { NAV_CLS }                from '@/lib/constants/ui-tokens.constant'
import {
  ICON_NAV,
  ICON_ACTION,
}                                 from '@/lib/constants/icons.constant'
import type { MenuGroup }         from '@/lib/types/dashboard-menu.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarNavProps {
  brandName:   string
  messages:    Record<string, string>
  featureKeys: string[]
  // Prop baru S#255: struktur menu dari katalog dashboard_menus (data-driven)
  // Jika tidak di-pass atau kosong, fallback ke SA_NAV_GROUPS (safety net)
  menuGroups?: MenuGroup[]
}

export function SidebarNav({ brandName, messages, featureKeys, menuGroups }: SidebarNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { mobileOpen, onMobileClose } = useMobileSidebar()

  // S#255: pakai katalog data-driven jika tersedia dan tidak kosong
  // Fallback ke SA_NAV_GROUPS untuk safety net (mis. DB down, cache miss)
  const useDataDriven = Array.isArray(menuGroups) && menuGroups.length > 0

  // Helper: ekstrak slug grup dari menuKey (mis. 'sa.konfigurasi' → 'konfigurasi')
  // Diperlukan untuk isGroupActive yang pakai slug pendek sebagai identifier
  function groupSlug(menuKey: string): string {
    return menuKey.replace(/^sa\./, '')
  }

  // Helper: resolve href item dari data-driven (featureFlag atau routePath)
  function resolveHref(routePath: string | null, featureFlag: string | null): string {
    if (routePath) return routePath
    if (featureFlag) return `/dashboard/superadmin/settings/${featureFlag.replace(/_/g, '-')}`
    return '/dashboard/superadmin'
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    if (useDataDriven) {
      for (const g of menuGroups!) {
        init[g.menuKey] = isGroupActive(groupSlug(g.menuKey), pathname)
      }
    } else {
      for (const g of SA_NAV_GROUPS) {
        init[g.key] = isGroupActive(g.key, pathname)
      }
    }
    return init
  })

  const gpsInfo = useGpsInfo(m('sidebar_gps_kota_fallback'))

  function m(key: string, vars?: Record<string, string>): string {
    const teks = messages[key] ?? key
    return vars ? interpolate(teks, vars) : teks
  }

  function isGroupActive(groupKey: string, path: string): boolean {
    if (groupKey === 'konfigurasi') return path.includes('/settings') || path.includes('/dropdowns')
    if (groupKey === 'konten')      return path.includes('/messages')
    if (groupKey === 'integrasi')   return path.includes('/providers')
    if (groupKey === 'manajemen')   return path.includes('/tenants') || path.includes('/categories') || path.includes('/wilayah')
    if (groupKey === 'pengguna')    return path.includes('/roles') || path.includes('/permissions') || path.includes('/memberships') || path.includes('/refunds')
    return false
  }

  useEffect(() => {
    // Guard dev: warning jika ada menu_key dari DB yang tidak dikenali di kode
    // Dijalankan di useEffect agar tidak ada side-effect di render phase (React rule)
    if (useDataDriven) warnUnknownMenuKeys(menuGroups!)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDataDriven])

  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev }
      if (useDataDriven) {
        for (const g of menuGroups!) {
          if (isGroupActive(groupSlug(g.menuKey), pathname)) next[g.menuKey] = true
        }
      } else {
        for (const g of SA_NAV_GROUPS) {
          if (isGroupActive(g.key, pathname)) next[g.key] = true
        }
      }
      return next
    })
  }, [pathname])

  function handleGroupClick(groupKey: string) {
    // groupKey = menuKey (data-driven) atau key (SA_NAV_GROUPS fallback)
    // Untuk isGroupActive, pakai slug: strip prefix 'sa.' jika ada
    const slug = groupSlug(groupKey)
    const isActive = isGroupActive(slug, pathname)
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

        {/* S#255: render dari katalog data-driven jika tersedia, fallback ke SA_NAV_GROUPS */}
        {useDataDriven ? (
          // ─── DATA-DRIVEN: dari dashboard_menus via getEffectiveMenu ────────────────
          menuGroups!.map(group => {
            const iconKey  = (group.iconKey ?? 'konfigurasi') as keyof typeof ICON_NAV
            const Icon     = ICON_NAV[iconKey] ?? ICON_NAV.konfigurasi
            const slug     = groupSlug(group.menuKey)
            const isActive = isGroupActive(slug, pathname)
            const isOpen   = openGroups[group.menuKey] ?? false

            // Filter item konfigurasi (featureFlag ada) mengikuti pola SA_NAV_GROUPS
            // Item dengan routePath (termasuk pilihan_opsi) bypass filter
            const subItems = slug === 'konfigurasi'
              ? group.items
                  .filter(item => item.routePath !== null || validFeatureKeys.has(item.featureFlag ?? ''))
                  .sort((a, b) =>
                    group.items.findIndex(x => x.menuKey === a.menuKey) -
                    group.items.findIndex(x => x.menuKey === b.menuKey)
                  )
              : group.items

            return (
              <div key={group.menuKey}>
                <button
                  onClick={() => handleGroupClick(group.menuKey)}
                  title={m(group.labelKey)}
                  className={[
                    NAV_CLS.parentBase,
                    isActive ? NAV_CLS.parentActive : NAV_CLS.parentInactive,
                  ].join(' ')}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="md:hidden lg:inline">{m(group.labelKey)}</span>
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
                      const href       = resolveHref(item.routePath, item.featureFlag)
                      const itemActive = pathname === href
                      return (
                        <Link
                          key={item.menuKey}
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
          })
        ) : (
          // ─── FALLBACK: SA_NAV_GROUPS hardcode (safety net jika DB down) ─────────────
          SA_NAV_GROUPS.map(group => {
            const Icon     = group.icon
            const isActive = isGroupActive(group.key, pathname)
            const isOpen   = openGroups[group.key] ?? false

            const subItems = group.key === 'konfigurasi'
              ? group.items
                  .filter(item => item.path !== undefined || validFeatureKeys.has(item.key))
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
          })
        )}

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
