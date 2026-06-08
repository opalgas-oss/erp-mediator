'use client'

// components/DashboardHeader.tsx
// Header bar dashboard — h-14, sejajar dengan sidebar header.
// Kiri  : hamburger mobile + judul halaman + deskripsi
// Kanan : avatar + dropdown logout
//
// REFACTOR Sesi #079 — DRY fix (BLOK B)
// REFACTOR Sesi #100 — Sentralisasi UI: resolvePageMeta + TYPOGRAPHY tokens
// CASE SESI-14 (8 Juni 2026): font Inter via TYPOGRAPHY token (20px semibold title, 12px desc)
//   Referensi: STANDAR_UI_UX_MOCKUP_RULES.md BAB 1

import { useState, useEffect, useRef } from 'react'
import { usePathname }                 from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { logoutAction }                from '@/app/auth/logout-action'
import { getCookie }                   from '@/lib/utils-client'
import { resolvePageMeta }             from '@/lib/constants/page-meta.constant'
import { TYPOGRAPHY }                  from '@/lib/constants/ui-tokens.constant'
import { ICON_ACTION, ICON_NAV }       from '@/lib/constants/icons.constant'

interface UserInfo { nama: string; email: string; role: string }

interface DashboardHeaderProps {
  messages?:    Record<string, string>
  onMenuClick?: () => void
}

function getInisial(nama: string, email: string): string {
  return (nama || email || '?').charAt(0).toUpperCase()
}

export function DashboardHeader({ messages = {}, onMenuClick }: DashboardHeaderProps) {
  const pathname    = usePathname()
  const [user,    setUser]    = useState<UserInfo | null>(null)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef           = useRef<HTMLDivElement>(null)

  const { titleKey, descKey } = resolvePageMeta(pathname)
  const pageTitle = messages[titleKey] ?? ''
  const pageDesc  = descKey ? (messages[descKey] ?? '') : ''

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const email    = session.user.email || ''
        const role     = (session.user.app_metadata?.['app_role'] as string) || getCookie('user_role') || ''
        const namaMeta = (session.user.user_metadata?.['nama'] as string) || ''
        let nama = namaMeta
        if (!nama) {
          const { data } = await supabase
            .from('user_profiles').select('nama').eq('id', session.user.id).single()
          nama = data?.nama || ''
        }
        setUser({ nama, email, role })
      } catch { /* tetap render tanpa info */ }
    }
    loadUser()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setLoading(true)
    await logoutAction()
  }

  const inisial     = user ? getInisial(user.nama, user.email) : '?'
  const namaDisplay = user?.nama || user?.email || '...'
  const roleDisplay = user?.role === 'SUPERADMIN' || user?.role === 'super_admin'
    ? 'Super Admin'
    : (user?.role || '')

  return (
    <header className="h-14 shrink-0 bg-white border-b border-[rgba(0,0,0,0.08)] flex items-center px-4 gap-3">

      {/* Hamburger — mobile only */}
      {onMenuClick && (
        <button onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-[#f9f9f8] transition-colors shrink-0"
          style={{ color: '#6b7280' }}
          aria-label="Buka menu">
          <ICON_NAV.hamburger size={20} />
        </button>
      )}

      {/* Judul halaman — STANDAR_UI_UX_MOCKUP_RULES BAB 1: 20px semibold, desc 12px */}
      {pageTitle ? (
        <div className="flex-1 min-w-0 flex items-baseline gap-2.5 overflow-hidden">
          <span className={TYPOGRAPHY.pageTitle}>{pageTitle}</span>
          {pageDesc && (
            <>
              <span className={TYPOGRAPHY.pageSep}>—</span>
              <span className={TYPOGRAPHY.pageDesc}>{pageDesc}</span>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Avatar + dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#f9f9f8] transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[13px] font-semibold">{inisial}</span>
          </div>
          <div className="text-left hidden sm:block">
            {/* STANDAR BAB 1: nama 14px medium, role 11px */}
            <p className="text-[14px] font-medium text-[#1f2937] leading-tight max-w-[140px] truncate">
              {namaDisplay}
            </p>
            {roleDisplay && (
              <p className="text-[11px] text-[#6b7280] leading-tight">{roleDisplay}</p>
            )}
          </div>
          <ICON_NAV.chevronDown size={14}
            className="text-[#9ca3af] transition-transform duration-200 shrink-0"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[rgba(0,0,0,0.12)] rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-[14px]">{inisial}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#1f2937] truncate">{namaDisplay}</p>
                  <p className="text-[11px] text-[#6b7280] truncate">{user?.email || ''}</p>
                  {roleDisplay && (
                    <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--color-info-bg)',
                        color: 'var(--color-info-text)',
                      }}>
                      {roleDisplay}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-1.5">
              <button onClick={handleLogout} disabled={loading}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] hover:bg-[#FCEBEB] transition-colors disabled:opacity-50"
                style={{ color: '#A32D2D' }}>
                <ICON_ACTION.logout size={15} className="shrink-0" />
                <span>{loading
                  ? (messages['header_logout_loading'] || 'Keluar...')
                  : (messages['header_logout_label']   || 'Logout')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
