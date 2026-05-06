'use client'

// components/DashboardHeader.tsx
// Header bar dashboard — h-14, sejajar dengan sidebar header.
// Kiri  : hamburger mobile + judul halaman (besar) — deskripsi (kecil, inline kanan)
// Kanan : avatar + dropdown logout
//
// REFACTOR Sesi #079 — DRY fix (BLOK B):
//   Hapus inline getCookie → import dari lib/utils-client
//
// REFACTOR Sesi #100 — Sentralisasi UI:
//   - Hapus regex /\/settings\/([^/]+)/ yang hanya bisa handle settings pages
//   - Ganti dengan resolvePageMeta(pathname) dari page-meta.constant
//   - Semua halaman (settings + non-settings) dapat title + desc otomatis
//   - Tambah halaman baru → cukup edit page-meta.constant, tidak perlu ubah file ini

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

  // ─── Resolve page title + desc dari konstanta terpusat ────────────────────
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
  const roleDisplay = user?.role === 'SUPERADMIN' ? 'Super Admin' : (user?.role || '')

  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center px-4 gap-3">

      {/* Hamburger — mobile only */}
      {onMenuClick && (
        <button onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 shrink-0"
          aria-label="Buka menu">
          <ICON_NAV.hamburger size={20} />
        </button>
      )}

      {/* Judul halaman — dari page-meta.constant, bukan regex */}
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
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">{inisial}</span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight max-w-[140px] truncate">{namaDisplay}</p>
            {roleDisplay && <p className="text-xs text-slate-400 leading-tight">{roleDisplay}</p>}
          </div>
          <ICON_NAV.chevronDown size={14}
            className="text-slate-400 transition-transform duration-200 shrink-0"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold">{inisial}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{namaDisplay}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
                  {roleDisplay && (
                    <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {roleDisplay}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-1.5">
              <button onClick={handleLogout} disabled={loading}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
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
