// Layout hanya bertugas render UI — auth sudah dihandle Middleware (Layer 2 Arsitektur)
import { SidebarNav } from '@/components/SidebarNav'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SidebarNav />
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
