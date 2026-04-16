import { redirect } from 'next/navigation'
import { verifyJWT } from '@/lib/auth-server'
import { SidebarNav } from '@/components/SidebarNav'

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
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}

