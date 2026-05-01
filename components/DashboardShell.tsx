'use client'

// components/DashboardShell.tsx
// Client wrapper GENERIC untuk semua dashboard — SA dan Vendor.
// Menerima sidebar sebagai ReactNode dari RSC layout — tidak coupling ke role tertentu.
//
// ARSITEKTUR Mobile Sidebar:
//   DashboardShell menyediakan MobileSidebarContext dengan state mobileOpen.
//   Sidebar (SidebarNav / VendorSidebarNav) membaca context via useMobileSidebar().
//   Ini diperlukan karena RSC tidak bisa pass function ke Client Component —
//   sidebar di-pass sebagai ReactNode, bukan render prop.
//
// UPDATE Sesi #076 — I-05:
//   Prop opsional sesiParalel untuk ConcurrentSessionBanner.
//
// REFACTOR Sesi #079 — DRY fix (BLOK B):
//   - Tambah MobileSidebarContext + useMobileSidebar hook (export untuk sidebar components)
//   - Ganti prop sidebar spesifik (brandName, featureKeys) → prop generic sidebar: ReactNode
//   - Hapus import SidebarNav (tidak lagi dirender di sini — di-inject dari layout)
//   - VendorDashboardShell dihapus — semua dashboard pakai komponen ini

import { useState, createContext, useContext } from 'react'
import { DashboardHeader }         from '@/components/DashboardHeader'
import { ConcurrentSessionBanner } from '@/components/ConcurrentSessionBanner'
import type { SesiParalelData }    from '@/components/ConcurrentSessionBanner'

// ─── Mobile Sidebar Context ───────────────────────────────────────────────────
// Di-provide oleh DashboardShell, dikonsumsi oleh SidebarNav + VendorSidebarNav.

interface MobileSidebarContextValue {
  mobileOpen:    boolean
  onMobileClose: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  mobileOpen:    false,
  onMobileClose: () => {},
})

/**
 * Hook untuk membaca state mobile sidebar dari DashboardShell.
 * Dipakai oleh SidebarNav dan VendorSidebarNav — tidak perlu prop drilling.
 */
export function useMobileSidebar(): MobileSidebarContextValue {
  return useContext(MobileSidebarContext)
}

// ─── DashboardShell ───────────────────────────────────────────────────────────

interface DashboardShellProps {
  /** Sidebar component — di-inject dari RSC layout (SidebarNav atau VendorSidebarNav) */
  sidebar:      React.ReactNode
  messages:     Record<string, string>
  children:     React.ReactNode
  /** Opsional — diisi layout RSC jika ada sesi paralel terdeteksi */
  sesiParalel?: SesiParalelData
}

export function DashboardShell({
  sidebar,
  messages,
  children,
  sesiParalel,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <MobileSidebarContext.Provider
      value={{ mobileOpen, onMobileClose: () => setMobileOpen(false) }}
    >
      <div className="flex h-screen overflow-hidden bg-slate-50">

        {/* Overlay mobile — klik untuk tutup sidebar */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — di-inject dari layout (SidebarNav atau VendorSidebarNav) */}
        {sidebar}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <DashboardHeader
            messages={messages}
            onMenuClick={() => setMobileOpen(true)}
          />

          {/* Banner sesi paralel — hanya muncul jika ada sesi lain yang aktif */}
          {sesiParalel && <ConcurrentSessionBanner sesiData={sesiParalel} />}

          <main className="flex-1 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>

      </div>
    </MobileSidebarContext.Provider>
  )
}
