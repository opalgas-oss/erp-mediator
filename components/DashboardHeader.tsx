'use client'

// components/DashboardHeader.tsx
// Header bar dashboard — pojok kanan atas
// Berisi: avatar/inisial + dropdown (nama, role, logout)
// Dipasang di layout.tsx semua dashboard role

import { useState, useEffect, useRef } from 'react'
import { LogOut, ChevronDown, User } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'

interface UserInfo {
  nama:  string
  email: string
  role:  string
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

function getInisial(nama: string, email: string): string {
  const sumber = nama || email || '?'
  return sumber.charAt(0).toUpperCase()
}

function formatLoginAt(raw: string): string {
  if (!raw) return ''
  try {
    const d = new Date(raw)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function DashboardHeader() {
  const [user,     setUser]     = useState<UserInfo | null>(null)
  const [open,     setOpen]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const dropdownRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const email    = session.user.email || ''
        const role     = (session.user.app_metadata?.['app_role'] as string) || getCookie('user_role') || ''
        const namaMeta = (session.user.user_metadata?.['nama'] as string) || ''

        // Coba baca nama dari user_profiles
        let nama = namaMeta
        if (!nama) {
          const { data } = await supabase
            .from('user_profiles')
            .select('nama')
            .eq('id', session.user.id)
            .single()
          nama = data?.nama || ''
        }

        setUser({ nama, email, role })
      } catch {
        // Gagal load user — header tetap render tanpa info
      }
    }
    loadUser()
  }, [])

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setLoading(true)
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    document.cookie = 'user_role=; path=/; max-age=0'
    document.cookie = 'tenant_id=; path=/; max-age=0'
    document.cookie = 'session_timeout_minutes=; path=/; max-age=0'
    document.cookie = 'session_last_active=; path=/; max-age=0'
    document.cookie = 'gps_kota=; path=/; max-age=0'
    document.cookie = 'session_login_at=; path=/; max-age=0'
    window.location.href = '/login'
  }

  const inisial  = user ? getInisial(user.nama, user.email) : '?'
  const namaDisplay = user?.nama || user?.email || '...'
  const roleDisplay = user?.role === 'SUPERADMIN' ? 'Super Admin' : (user?.role || '')

  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-end px-6">
      <div className="relative" ref={dropdownRef}>
        {/* Trigger: avatar + nama + chevron */}
        <button
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {/* Avatar lingkaran inisial */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">{inisial}</span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight max-w-[140px] truncate">
              {namaDisplay}
            </p>
            {roleDisplay && (
              <p className="text-xs text-slate-400 leading-tight">{roleDisplay}</p>
            )}
          </div>
          <ChevronDown
            size={14}
            className="text-slate-400 transition-transform duration-200 shrink-0"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {/* Info akun */}
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

            {/* Aksi */}
            <div className="p-1.5">
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <LogOut size={15} className="shrink-0" />
                <span>{loading ? 'Keluar...' : 'Logout'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
