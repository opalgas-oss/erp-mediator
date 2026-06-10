'use client'

// components/admintenant/AdminTenantSidebarNav.tsx
// Sidebar navigasi Dashboard AdminTenant.
//
// Struktur: dark sidebar #1a1a1a, 3 seksi (UTAMA / KEUANGAN / PENGATURAN).
// Acuan: ACUAN_MOCKUP_DASHBOARD_AT_v1.md Bab 2 + Bab 5.
// Dibuat: 10 Juni 2026 — CASE SESI-26 (A-F7 skeleton Dashboard AT)
//
// CATATAN: Menu ini adalah skeleton awal.
// Menu yang tampil akan dikontrol oleh data-driven system (dashboard_menus)
// setelah A-F9 (Ceiling SA) selesai diimplementasikan.

import Link                       from 'next/link'
import { usePathname }            from 'next/navigation'
import { useState }               from 'react'
import { logoutAction }           from '@/app/auth/logout-action'
import { useMobileSidebar }       from '@/components/DashboardShell'

// ─── Tipe Menu ────────────────────────────────────────────────────────────────

interface NavItem {
  label:   string
  icon:    string
  href:    string
  isPjOnly?: boolean
}

interface NavSection {
  section: string
  items:   NavItem[]
}

// ─── Definisi Menu Statis (Skeleton) ─────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    section: 'UTAMA',
    items: [
      { label: 'Beranda',               icon: 'ti-home-2',      href: '/dashboard/admintenant' },
      { label: 'Permintaan & Lelang',   icon: 'ti-gavel',       href: '/dashboard/admintenant/lelang' },
      { label: 'Manajemen Vendor',      icon: 'ti-users-group', href: '/dashboard/admintenant/vendor' },
    ],
  },
  {
    section: 'KEUANGAN',
    items: [
      { label: 'Keuangan & Pencairan',  icon: 'ti-receipt-2',   href: '/dashboard/admintenant/keuangan' },
      { label: 'Laporan & Analitik',    icon: 'ti-chart-bar',   href: '/dashboard/admintenant/laporan' },
    ],
  },
  {
    section: 'PENGATURAN',
    items: [
      { label: 'Profil & Tim',              icon: 'ti-building-store',        href: '/dashboard/admintenant/profil' },
      { label: 'Pengaturan Operasional',    icon: 'ti-settings-2',            href: '/dashboard/admintenant/pengaturan' },
      { label: 'Notifikasi & Log',          icon: 'ti-bell-ringing-2',        href: '/dashboard/admintenant/notifikasi' },
    ],
  },
  {
    section: 'KHUSUS PJ',
    items: [
      { label: 'Kelola Akses Role',     icon: 'ti-shield-lock',             href: '/dashboard/admintenant/akses', isPjOnly: true },
      { label: 'Konfigurasi System',    icon: 'ti-adjustments-horizontal',  href: '/dashboard/admintenant/konfigurasi', isPjOnly: true },
    ],
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminTenantSidebarNavProps {
  tenantNama:  string
  userNama:    string
  userJabatan: string
  messages:    Record<string, string>
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export function AdminTenantSidebarNav({
  tenantNama,
  userNama,
  userJabatan,
  messages,
}: AdminTenantSidebarNavProps) {
  const pathname  = usePathname()
  const { mobileOpen, onMobileClose } = useMobileSidebar()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await logoutAction()
  }

  function isActive(href: string): boolean {
    if (href === '/dashboard/admintenant') return pathname === href
    return pathname.startsWith(href)
  }

  const inisial = (userNama || '?').slice(0, 2).toUpperCase()

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'flex flex-col w-64 shrink-0 h-screen z-50 transition-transform duration-300',
          'fixed lg:static top-0 left-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        style={{ background: '#1a1a1a' }}
      >
        {/* Header — nama tenant */}
        <div className="h-16 flex items-center px-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-[14px] font-semibold truncate"
            style={{ color: 'rgba(255,255,255,0.95)' }}>
            {tenantNama || 'AdminTenant Panel'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.section} className="mb-4">

              {/* Label seksi */}
              <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>
                {section.section}
              </p>

              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-colors"
                    style={{
                      background: active ? 'rgba(24,95,165,0.25)' : 'transparent',
                      color: active
                        ? '#ffffff'
                        : 'rgba(255,255,255,0.65)',
                    }}
                  >
                    <i className={`ti ${item.icon} text-[16px] shrink-0`} />
                    <span className="text-[13px] flex-1">{item.label}</span>
                    {item.isPjOnly && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(24,95,165,0.4)', color: '#93c5fd' }}>
                        PJ
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer — info user + tombol keluar */}
        <div className="shrink-0 p-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
              {inisial}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate"
                style={{ color: 'rgba(255,255,255,0.9)' }}>
                {userNama || '—'}
              </p>
              <p className="text-[11px] truncate"
                style={{ color: 'rgba(255,255,255,0.45)' }}>
                {userJabatan || 'AdminTenant'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors disabled:opacity-50"
            style={{ color: '#fca5a5' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <i className="ti ti-logout text-[15px] shrink-0" />
            <span>{loading ? 'Keluar...' : (messages['header_logout_label'] || 'Keluar')}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
