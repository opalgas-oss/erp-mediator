'use client'

// components/VendorDashboardShell.tsx
// Client wrapper layout Vendor — mengelola state mobile sidebar.
// Struktur identik dengan DashboardShell (SA) — hanya sidebar berbeda.
// DashboardHeader dipakai bersama (logout, avatar, dropdown) — ATURAN 11.
// Dibuat: Sesi #062

import { useState }           from 'react'
import { VendorSidebarNav }   from '@/components/VendorSidebarNav'
import { DashboardHeader }    from '@/components/DashboardHeader'

interface VendorDashboardShellProps {
  brandName: string
  messages:  Record<string, string>
  children:  React.ReactNode
}

export function VendorDashboardShell({ brandName, messages, children }: VendorDashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <VendorSidebarNav
        brandName={brandName}
        messages={messages}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader messages={messages} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
