'use client'

// components/DashboardShell.tsx
// Client wrapper untuk dashboard layout — mengelola state mobile sidebar.
// Meneruskan messages ke SidebarNav DAN DashboardHeader.
//
// UPDATE Sesi #076 — I-05:
//   Tambah prop opsional `sesiParalel` untuk menampilkan ConcurrentSessionBanner.
//   Banner dirender di antara DashboardHeader dan <main> — non-blocking, dismissible.
//   Jika sesiParalel tidak ada atau adaSesi=false: tidak ada perubahan visual sama sekali.

import { useState } from 'react'
import { SidebarNav }                from '@/components/SidebarNav'
import { DashboardHeader }           from '@/components/DashboardHeader'
import { ConcurrentSessionBanner }   from '@/components/ConcurrentSessionBanner'
import type { SesiParalelData }      from '@/components/ConcurrentSessionBanner'

interface DashboardShellProps {
  brandName:    string
  messages:     Record<string, string>
  featureKeys:  string[]
  children:     React.ReactNode
  // opsional — diisi layout RSC jika ada sesi paralel terdeteksi
  sesiParalel?: SesiParalelData
}

export function DashboardShell({ brandName, messages, featureKeys, children, sesiParalel }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <SidebarNav
        brandName={brandName}
        messages={messages}
        featureKeys={featureKeys}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader
          messages={messages}
          onMenuClick={() => setMobileOpen(true)}
        />

        {/* Banner sesi paralel — hanya muncul jika ada data sesi lain yang aktif */}
        {sesiParalel && <ConcurrentSessionBanner sesiData={sesiParalel} />}

        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
