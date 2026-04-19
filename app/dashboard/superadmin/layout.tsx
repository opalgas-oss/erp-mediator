// force-dynamic: layout ini verifikasi JWT ke Supabase — tidak boleh di-prerender saat build
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { verifyJWT } from '@/lib/auth-server'
import { SidebarNav } from '@/components/SidebarNav'
import { DashboardHeader } from '@/components/DashboardHeader'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'SUPERADMIN') {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
