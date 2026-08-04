// Halaman utama homepage — Server Component, merakit semua komponen
// metadata diekspor di sini agar Next.js bisa inject ke <head>
import type { Metadata } from 'next'
import HomepageClient from '@/components/homepage/HomepageClient'
import { getMaintenanceConfig } from '@/lib/maintenance'
import { MaintenanceView } from '@/components/maintenance/MaintenanceView'

// Homepage kini membaca config maintenance (server) tiap request → tidak bisa di-prerender statis.
// force-dynamic: sama pola dengan halaman config SA; hindari build-time DB call (fix build S#412).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mediator — Platform Jasa Terpercaya Indonesia',
  description: 'Pasang kebutuhan, mitra lokal bersaing memberikan penawaran terbaik.',
}

export default async function Home() {
  // Gate maintenance (loop config `sistem`, S#412): publik/customer melihat halaman
  // maintenance saat mode ON. SA & AdminTenant tetap bisa masuk lewat pintu login +
  // dashboard mereka (route itu tidak digate).
  const maintenance = await getMaintenanceConfig()
  if (maintenance.on) return <MaintenanceView data={maintenance} />

  return <HomepageClient />
}
