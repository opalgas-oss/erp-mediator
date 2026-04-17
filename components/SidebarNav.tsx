'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'

const SUB_MENU = [
  { label: 'Login',               href: '/dashboard/superadmin/settings/config' },
  { label: 'Register User',       href: '/dashboard/superadmin/settings/register-user' },
  { label: 'Register Vendor',     href: '/dashboard/superadmin/settings/register-vendor' },
  { label: 'Order Form',          href: '/dashboard/superadmin/settings/order-form' },
  { label: 'Bidding Vendor',      href: '/dashboard/superadmin/settings/bidding-vendor' },
  { label: 'Payment',             href: '/dashboard/superadmin/settings/payment' },
  { label: 'Tampilan & Branding', href: '/dashboard/superadmin/settings/branding' },
  { label: 'Pesan & Notifikasi',  href: '/dashboard/superadmin/settings/pesan' },
  { label: 'Sistem',              href: '/dashboard/superadmin/settings/sistem' },
  { label: 'Pilihan Opsi',        href: '/dashboard/superadmin/settings/pilihan-opsi' },
]

export function SidebarNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => pathname.includes('/settings'))

  useEffect(() => {
    if (pathname.includes('/settings')) {
      setOpen(true)
    }
  }, [pathname])

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 shrink-0">
        <p className="text-sm font-bold text-slate-900 leading-tight">ERP Mediator</p>
        <p className="text-xs text-slate-400 mt-0.5">SuperAdmin Panel</p>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-auto px-2 py-3">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-blue-700 hover:bg-slate-100 transition-colors"
        >
          <Settings size={15} className="shrink-0 opacity-70" />
          <span>Konfigurasi</span>
          <span
            className="ml-auto text-xs text-slate-400 transition-transform duration-200"
            style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▼
          </span>
        </button>
        {open && (
          <div className="mt-0.5">
            {SUB_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`block py-1.5 pl-9 pr-3 text-xs rounded-md my-px transition-colors whitespace-nowrap ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
