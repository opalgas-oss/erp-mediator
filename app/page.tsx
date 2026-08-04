// Halaman utama homepage — Server Component, merakit semua komponen
// metadata diekspor di sini agar Next.js bisa inject ke <head>
import type { Metadata } from 'next'
import HomepageClient from '@/components/homepage/HomepageClient'
import { MaintenanceGate } from '@/components/maintenance/MaintenanceGate'

// Homepage kini membaca config maintenance (server) tiap request → tidak bisa di-prerender statis.
// force-dynamic: sama pola dengan halaman config SA; hindari build-time DB call (fix build S#412).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mediator — Platform Jasa Terpercaya Indonesia',
  description: 'Pasang kebutuhan, mitra lokal bersaing memberikan penawaran terbaik.',
}

export default function Home() {
  // Gate maintenance (loop config `sistem`, S#412): publik/customer melihat halaman
  // maintenance saat mode ON. SA & AdminTenant tetap bisa masuk lewat pintu login +
  // dashboard mereka (route itu tidak digate).
  //
  // ⚠️ S#435 — tiga baris keputusan di sini DIGANTI komponen bersama `MaintenanceGate`.
  //   Sebelumnya berkas ini membaca config sendiri lalu memutuskan sendiri, dan blok yang PERSIS
  //   SAMA hidup juga di `app/dashboard/vendor/layout.tsx`. Menambah tiga permukaan lagi (AT,
  //   register, pending-approval) dengan cara itu = LIMA salinan satu keputusan — dan keputusan
  //   ini yang kalau salah mengunci SA di luar platformnya sendiri. Logikanya kini ditulis sekali
  //   (§4 A2 koreksi 1.4.1); `area` dioper eksplisit supaya laporan gangguan tercatat pada
  //   permukaan yang benar (menutup `TEMUAN-429-AREA-HARDCODE` #64).
  //
  //   `async` dibuang karena berkas ini tidak lagi menunggu apa pun — pembacaan config pindah ke
  //   dalam gerbang. `force-dynamic` di atas TETAP: gerbang membaca `config_registry` tiap
  //   permintaan, jadi halaman ini memang tidak boleh di-prerender statis.
  return (
    <MaintenanceGate area="publik">
      <HomepageClient />
    </MaintenanceGate>
  )
}
