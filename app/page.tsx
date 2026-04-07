// Halaman utama homepage — Server Component, merakit semua komponen
// metadata diekspor di sini agar Next.js bisa inject ke <head>
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import HomepageClient from '@/components/homepage/HomepageClient'

const StatsBar = dynamic(() => import('@/components/homepage/StatsBar'), { ssr: false })

export const metadata: Metadata = {
  title: 'Mediator — Platform Jasa Terpercaya Indonesia',
  description: 'Pasang kebutuhan, mitra lokal bersaing memberikan penawaran terbaik.',
}

export default function Home() {
  // StatsBar di-load secara dinamis di browser (ssr: false) — tidak di-render saat build
  return <HomepageClient statsBar={<StatsBar />} />
}
