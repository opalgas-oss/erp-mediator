'use client'

// components/SidebarNav.tsx
// Sidebar navigasi dashboard SuperAdmin.
// Data-driven: label menu dari message_library, struktur menu dari nav.constant.
//
// REFACTOR Sesi #100 — Sentralisasi UI:
//   - Icon dari ICON_NAV (icons.constant), CSS class dari NAV_CLS (ui-tokens.constant)
// Updated Sesi #135: tambah isGroupActive case 'pengguna'
// Updated Sesi #136: tambah /memberships ke isGroupActive case 'pengguna'
// Updated Sesi #137: tambah /refunds ke isGroupActive case 'pengguna'
// Updated Sesi #144: tambah /wilayah ke isGroupActive case 'manajemen'
// CASE SESI-14 (8 Juni 2026): sidebar gelap #1a1a1a + font light rgba(255,255,255,N)
//   Referensi: STANDAR_UI_UX_MOCKUP_RULES.md BAB 4

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect }    from 'react'
import { interpolate }            from '@/lib/utils-client'
import { useGpsInfo }             from '@/lib/hooks/useGpsInfo'
import { useMobileSidebar }       from '@/components/DashboardShell'
import {
  SA_NAV_GROUPS,
  navItemToPath,
  warnUnknownMenuKeys,
}                                 from '@/lib/constants/nav.constant'
import { NAV_CLS }                from '@/lib/constants/ui-tokens.constant'
import { ICON_NAV }               from '@/lib/constants/icons.constant'
import type { MenuGroup }         from '@/lib/types/dashboard-menu.types'

interface SidebarNavProps {
  brandName:   string
  messages:    Record<string, string>
  featureKeys: string[]
  menuGroups?: MenuGroup[]
}

export function SidebarNav({ brandName, messages, menuGroups }: SidebarNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { mobileOpen, onMobileClose } = useMobileSidebar()

  const useDataDriven = Array.isArray(menuGroups) && menuGroups.length > 0

  function groupSlug(menuKey: string): string {
    return menuKey.replace(/^sa\./, '')
  }

  function resolveHref(routePath: string | null, featureFlag: string | null): string {
    if (routePath) return routePath
    if (featureFlag) return `/dashboard/superadmin/settings/${featureFlag.replace(/_/g, '-')}`
    return '/dashboard/superadmin'
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    if (useDataDriven) {
      for (const g of menuGroups!) init[g.menuKey] = isGroupActive(groupSlug(g.menuKey), pathname)
    } else {
      for (const g of SA_NAV_GROUPS) init[g.key] = isGroupActive(g.key, pathname)
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
    const slug     = groupSlug(groupKey)
    const isActive = isGroupActive(slug, pathname)
    const isOpen   = openGroups[groupKey]
    if (isOpen && isActive) {
      setOpenGroups(prev => ({ ...prev, [groupKey]: false }))
      router.push('/dashboard/superadmin')
    } else {
      setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))
    }
  }

  const TabletIcon = ICON_NAV.konfigurasi

  return (
    // STANDAR_UI_UX_MOCKUP_RULES BAB 4: sidebar gelap #1a1a1a
    <aside
      className={[
        'flex flex-col h-screen overflow-hidden shrink-0 transition-transform duration-300',
        'fixed inset-y-0 left-0 z-50 w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'md:static md:translate-x-0 md:w-[52px] md:z-auto',
        'lg:w-64',
      ].join(' ')}
      style={{ background: '#1a1a1a' }}
    >

      {/* ─── Header Sidebar ───────────────────────────────────────────────────── */}
      <div
        className="h-14 shrink-0 flex items-center px-6 md:justify-center md:px-0 lg:justify-start lg:px-6"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex-1 md:hidden lg:block">
          <p className="text-[13px] font-semibold leading-tight" style={{ color: '#ffffff' }}>
            {brandName}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {m('sidebar_brand_sublabel')}
          </p>
        </div>
        {/* Tablet icon-only */}
        <div className="hidden md:flex lg:hidden items-center justify-center w-8 h-8">
          <TabletIcon size={17} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </div>
        {/* Tutup sidebar mobile */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          aria-label="Tutup sidebar"
        >
          <ICON_NAV.close size={16} />
        </button>
      </div>

      {/* ─── Navigasi ─────────────────────────────────────────────────────────── */}
      <nav className={NAV_CLS.nav}>

        {useDataDriven ? (
          // ─── DATA-DRIVEN: dari dashboard_menus via getEffectiveMenu ──────────
          menuGroups!.map(group => {
            const iconKey  = (group.iconKey ?? 'konfigurasi') as keyof typeof ICON_NAV
            const Icon     = ICON_NAV[iconKey] ?? ICON_NAV.konfigurasi
            const slug     = groupSlug(group.menuKey)
            const isActive = isGroupActive(slug, pathname)
            const isOpen   = openGroups[group.menuKey] ?? false

            const subItems = group.items

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
                    className={[NAV_CLS.chevron, isOpen ? NAV_CLS.chevronOpen : ''].join(' ')}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 mb-1 md:hidden lg:block">
                    {subItems.map(item => {
                      const href       = resolveHref(item.routePath, item.featureFlag)
                      const itemActive = pathname === href || pathname.startsWith(href + '/')
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
          // ─── FALLBACK: SA_NAV_GROUPS (safety net jika DB down) ────────────────
          SA_NAV_GROUPS.map(group => {
            const Icon     = group.icon
            const isActive = isGroupActive(group.key, pathname)
            const isOpen   = openGroups[group.key] ?? false

            const subItems = group.items

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
                    className={[NAV_CLS.chevron, isOpen ? NAV_CLS.chevronOpen : ''].join(' ')}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 mb-1 md:hidden lg:block">
                    {subItems.map(item => {
                      const href       = navItemToPath(item)
                      const itemActive = pathname === href || pathname.startsWith(href + '/')
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
      <div
        className="px-4 py-3 shrink-0 md:hidden lg:flex"
        style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-start gap-1.5 w-full">
          <ICON_NAV.gps size={12} className="shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' } as React.CSSProperties} />
          <div>
            <p className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {gpsInfo.kota}
            </p>
            {gpsInfo.loginAt && (
              <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {m('sidebar_gps_login_prefix', { waktu: gpsInfo.loginAt })}
              </p>
            )}
          </div>
        </div>
      </div>

    </aside>
  )
}
