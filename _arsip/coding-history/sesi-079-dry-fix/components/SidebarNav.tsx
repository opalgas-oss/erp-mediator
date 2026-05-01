'use client'

// components/SidebarNav.tsx — ARSIP Sesi #079 sebelum DRY refactor
// Lihat: _arsip/coding-history/sesi-079-dry-fix/

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Settings, MapPin, X } from 'lucide-react'

const NAV_POSITION: Record<string, number> = {
  security_login:   10,
  register_user:    20,
  register_vendor:  30,
  order_form:       40,
  bidding_vendor:   50,
  payment:          60,
  branding:         70,
  pesan:            80,
  sistem:           90,
  pilihan_opsi:    100,
}

function featureKeyToPath(key: string): string {
  return `/dashboard/superadmin/settings/${key.replace(/_/g, '-')}`
}

function interpolate(teks: string, vars: Record<string, string>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

interface SidebarNavProps {
  brandName:     string
  messages:      Record<string, string>
  featureKeys:   string[]
  mobileOpen:    boolean
  onMobileClose: () => void
}

export function SidebarNav({ brandName, messages, featureKeys, mobileOpen, onMobileClose }: SidebarNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(() => pathname.includes('/settings'))
  const [gpsInfo, setGpsInfo] = useState({ kota: '', loginAt: '' })

  function m(key: string, vars?: Record<string, string>): string {
    const teks = messages[key] ?? key
    return vars ? interpolate(teks, vars) : teks
  }

  useEffect(() => {
    if (pathname.includes('/settings')) setOpen(true)
  }, [pathname])

  useEffect(() => {
    function getCookie(name: string) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      return match ? decodeURIComponent(match[2]) : ''
    }
    const kota    = getCookie('gps_kota')
    const loginAt = getCookie('session_login_at')
    let waktu = ''
    if (loginAt) {
      try {
        waktu = new Date(loginAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      } catch { /* skip */ }
    }
    setGpsInfo({ kota: kota || m('sidebar_gps_kota_fallback'), loginAt: waktu })
  }, [messages])

  // ... (isi lengkap sama dengan file asli)
}
