"use client"

// Komponen client untuk homepage — mengelola state login modal dan filter kategori
import { useState } from 'react'
import dynamic from 'next/dynamic'
import Navbar from '@/components/homepage/Navbar'
import Hero from '@/components/homepage/Hero'
import CategoryFilter from '@/components/homepage/CategoryFilter'
import ProductGrid from '@/components/homepage/ProductGrid'
import Footer from '@/components/homepage/Footer'
import LoginModal from '@/components/homepage/LoginModal'

// ssr: false wajib di client component — StatsBar fetch config via useEffect di browser
const StatsBar = dynamic(() => import('@/components/homepage/StatsBar'), { ssr: false })

export default function HomepageClient() {
  // State modal login
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  // State filter kategori yang aktif
  const [activeKategori, setActiveKategori] = useState('Semua')

  // Dipanggil saat user yang belum login klik produk atau pasang order
  const handleProtectedAction = () => {
    // Sprint 4 akan membedakan aksi berdasarkan login state
    // Untuk sekarang selalu buka modal login
    setIsLoginModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar onPasangOrderClick={handleProtectedAction} />
      <main>
        <Hero onPasangOrderClick={handleProtectedAction} />
        {/* StatsBar di-load dinamis di browser — ssr: false */}
        <StatsBar />
        <CategoryFilter
          activeKategori={activeKategori}
          onKategoriChange={setActiveKategori}
        />
        <ProductGrid
          activeKategori={activeKategori}
          onKlikProduk={handleProtectedAction}
          onResetKategori={() => setActiveKategori('Semua')}
        />
      </main>
      <Footer />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  )
}
