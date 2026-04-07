"use client"

// Komponen client untuk homepage — mengelola state login modal dan filter kategori
// StatsBar diterima sebagai ReactNode dari Server Component (page.tsx) agar async component bisa dipakai
import { useState } from 'react'
import type { ReactNode } from 'react'
import Navbar from '@/components/homepage/Navbar'
import Hero from '@/components/homepage/Hero'
import CategoryFilter from '@/components/homepage/CategoryFilter'
import ProductGrid from '@/components/homepage/ProductGrid'
import Footer from '@/components/homepage/Footer'
import LoginModal from '@/components/homepage/LoginModal'

interface HomepageClientProps {
  statsBar: ReactNode  // StatsBar dikirim dari Server Component sebagai prop
}

export default function HomepageClient({ statsBar }: HomepageClientProps) {
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
        {/* StatsBar diterima sebagai prop — async Server Component */}
        {statsBar}
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
