import { redirect } from 'next/navigation'
import { verifyJWT } from '@/lib/auth-server'
import { SidebarNav } from '@/components/SidebarNav'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layer 3 — verifikasi kriptografi penuh via Firebase Admin SDK
  // Middleware (Layer 2) hanya decode base64 untuk routing — tidak verifikasi tanda tangan
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
