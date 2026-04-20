'use client'

// components/DashboardShell.tsx
// Client wrapper untuk dashboard layout — mengelola state mobile sidebar.
// Meneruskan messages ke SidebarNav DAN DashboardHeader.

import { useState } from 'react'
import { SidebarNav }      from '@/components/SidebarNav'
import { DashboardHeader } from '@/components/DashboardHeader'

interface DashboardShellProps {
  brandName:   string
  messages:    Record<string, string>
  featureKeys: string[]
  children:    React.ReactNode
}

export function DashboardShell({ brandName, messages, featureKeys, children }: DashboardShellProps) {
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
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
