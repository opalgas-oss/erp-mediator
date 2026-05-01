'use client'

// components/VendorSidebarNav.tsx — ARSIP Sesi #079 sebelum DRY refactor
// Isu: getCookie duplikat, GPS logic duplikat, hardcode 'Tidak Diketahui' + 'Login {waktu}'
// Lihat: _arsip/coding-history/sesi-079-dry-fix/

import Link        from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, ShoppingBag, Clock, Package, History, Store, User, Lock, MapPin, X } from 'lucide-react'

const VENDOR_MENU = [
  { key: 'ringkasan',   label: 'Ringkasan',          href: '/dashboard/vendor',                  icon: LayoutDashboard },
  { key: 'order-masuk', label: 'Order Masuk',         href: '/dashboard/vendor/order-masuk',      icon: ShoppingBag     },
  { key: 'bidding',     label: 'Bidding Aktif',       href: '/dashboard/vendor/bidding-aktif',    icon: Clock           },
  { key: 'dikerjakan',  label: 'Order Dikerjakan',    href: '/dashboard/vendor/order-dikerjakan', icon: Package         },
  { key: 'produk',      label: 'Produk',              href: '/dashboard/vendor/produk',           icon: Store           },
  { key: 'history',     label: 'History Transaksi',   href: '/dashboard/vendor/history',          icon: History         },
  { key: 'profil',      label: 'Edit Profil',         href: '/dashboard/vendor/profil',           icon: User            },
  { key: 'password',    label: 'Ganti Password',      href: '/dashboard/vendor/ganti-password',   icon: Lock            },
] as const

interface VendorSidebarNavProps {
  brandName:     string
  messages:      Record<string, string>
  mobileOpen:    boolean
  onMobileClose: () => void
}

export function VendorSidebarNav({ brandName, messages, mobileOpen, onMobileClose }: VendorSidebarNavProps) {
  const pathname = usePathname()
  const [gpsInfo, setGpsInfo] = useState({ kota: '', loginAt: '' })

  function m(key: string): string { return messages[key] ?? '' }

  useEffect(() => {
    function getCookie(name: string) {  // DUPLIKAT — akan di-extract ke lib/utils-client.ts
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      return match ? decodeURIComponent(match[2]) : ''
    }
    const kota    = getCookie('gps_kota')
    const loginAt = getCookie('session_login_at')
    let waktu = ''
    if (loginAt) {
      try { waktu = new Date(loginAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
      catch { /* skip */ }
    }
    setGpsInfo({ kota: kota || 'Tidak Diketahui', loginAt: waktu })  // HARDCODE — akan difix B4
  }, [])

  // ... (isi lengkap sama dengan file asli)
}
