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
//
// REFACTOR Sesi #100 — Sentralisasi Scroll:
//   - <main> pakai SCROLL_CLS.main dari ui-tokens.constant
//   - Satu titik kontrol scroll vertikal + horizontal untuk SELURUH content area
//   - Semua halaman delegasi scroll ke sini — tidak boleh definisi overflow sendiri

import { useState, createContext, useContext } from 'react'
import { DashboardHeader }         from '@/components/DashboardHeader'
import { ConcurrentSessionBanner } from '@/components/ConcurrentSessionBanner'
import { SCROLL_CLS }              from '@/lib/constants/ui-tokens.constant'
import type { SesiParalelData }    from '@/components/ConcurrentSessionBanner'

// ─── Mobile Sidebar Context ───────────────────────────────────────────────────

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
  sidebar:      React.ReactNode
  messages:     Record<string, string>
  children:     React.ReactNode
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

        {/* Overlay mobile */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar kiri — di-inject dari layout */}
        {sidebar}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <DashboardHeader
            messages={messages}
            onMenuClick={() => setMobileOpen(true)}
          />

          {sesiParalel && <ConcurrentSessionBanner sesiData={sesiParalel} />}

          {/*
           * SCROLL TERPUSAT — satu-satunya titik definisi scroll untuk seluruh content area.
           * overflow-y-auto : scroll vertikal otomatis jika konten > tinggi layar
           * overflow-x-auto : scroll horizontal otomatis jika konten > lebar layar (tabel lebar)
           * Semua halaman (ConfigPageClient, MessageLibraryClient, dst) TIDAK boleh
           * mendefinisikan overflow sendiri — delegasi ke sini.
           */}
          <main className={SCROLL_CLS.main}>
            {children}
          </main>
        </div>

      </div>
    </MobileSidebarContext.Provider>
  )
}
