// Halaman utama homepage — Server Component, merakit semua komponen
// metadata diekspor di sini agar Next.js bisa inject ke <head>
import type { Metadata } from 'next'
import StatsBar from '@/components/homepage/StatsBar'
import HomepageClient from '@/components/homepage/HomepageClient'

export const metadata: Metadata = {
  title: 'Mediator — Platform Jasa Terpercaya Indonesia',
  description: 'Pasang kebutuhan, mitra lokal bersaing memberikan penawaran terbaik.',
}

export default function Home() {
  // StatsBar adalah async Server Component — di-render di sini lalu dikirim ke client sebagai ReactNode
  return <HomepageClient statsBar={<StatsBar />} />
}
