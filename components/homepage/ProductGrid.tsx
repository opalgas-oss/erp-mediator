"use client"

// Komponen grid produk — menampilkan daftar produk/jasa dengan filter dan pagination
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import ProductCard, { type Product } from '@/components/homepage/ProductCard'

interface ProductGridProps {
  activeKategori: string
  onKlikProduk: () => void       // parent handle cek login
  onResetKategori?: () => void   // opsional — reset filter ke 'Semua'
}

// Data mock produk — akan diganti dengan data Firestore di Sprint berikutnya
const MOCK_PRODUCTS: Product[] = [
  { id: '1', nama: 'Papan Ucapan Selamat & Sukses', kategori: 'Bunga Papan', harga: 450000, foto_url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=400&q=80' },
  { id: '2', nama: 'Papan Bunga Duka Cita', kategori: 'Bunga Papan', harga: 350000, foto_url: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=400&q=80' },
  { id: '3', nama: 'Bersih Rumah 2 Kamar Tidur', kategori: 'Bersih Rumah', harga: 250000, foto_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id: '4', nama: 'Bersih Kantor hingga 50m2', kategori: 'Bersih Rumah', harga: 180000, foto_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80' },
  { id: '5', nama: 'Kirim Barang Motor — Intra Kota', kategori: 'Jasa Kirim', harga: 35000, foto_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80' },
  { id: '6', nama: 'Kirim Barang Pickup — Antar Kota', kategori: 'Jasa Kirim', harga: 120000, foto_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=80' },
  { id: '7', nama: 'Servis AC Split 1/2 PK sampai 2 PK', kategori: 'Servis AC', harga: 85000, foto_url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80' },
  { id: '8', nama: 'Servis Kulkas Tidak Dingin', kategori: 'Servis Elektronik', harga: 95000, foto_url: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&q=80' },
  { id: '9', nama: 'Katering Nasi Box 50 Porsi', kategori: 'Katering', harga: 750000, foto_url: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400&q=80' },
  { id: '10', nama: 'Foto Produk Studio Mini', kategori: 'Foto & Video', harga: 300000, foto_url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&q=80' },
  { id: '11', nama: 'Pasang Keramik Lantai per m2', kategori: 'Renovasi', harga: 85000, foto_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80' },
  { id: '12', nama: 'Pijat Relaksasi Panggilan', kategori: 'Pijat & Relaksasi', harga: 150000, foto_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80' },
]

export default function ProductGrid({ activeKategori, onKlikProduk, onResetKategori }: ProductGridProps) {
  // Simulasi loading 800ms saat pertama kali render
  const [isLoading, setIsLoading] = useState(true)
  // Jumlah kartu yang ditampilkan — default 8
  const [displayCount, setDisplayCount] = useState(8)

  useEffect(() => {
    // Simulasi loading data
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Filter produk berdasarkan kategori yang aktif
  const filteredProducts =
    activeKategori === 'Semua'
      ? MOCK_PRODUCTS
      : MOCK_PRODUCTS.filter((p) => p.kategori === activeKategori)

  // Produk yang benar-benar ditampilkan (dibatasi displayCount)
  const visibleProducts = filteredProducts.slice(0, displayCount)

  // Badge kategori hanya tampil saat filter 'Semua'
  const showKategoriBadge = activeKategori === 'Semua'

  return (
    <section id="product-grid" className="px-4 md:px-6 py-6">
      {/* Judul section */}
      <h2 className="font-semibold mb-4 text-base">Jelajahi Produk &amp; Jasa</h2>

      {isLoading ? (
        // Skeleton loading — 8 kartu placeholder
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border rounded-lg overflow-hidden bg-white">
              {/* Skeleton foto */}
              <Skeleton className="h-40 w-full rounded-none" />
              {/* Skeleton teks */}
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        // Empty state — kategori tidak punya produk
        <div className="flex flex-col items-center py-16 text-center gap-3">
          <Search size={40} className="text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Belum ada produk di kategori ini</p>
          <p className="text-sm text-muted-foreground">
            Coba kategori lain atau lihat semua produk
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResetKategori?.()}
          >
            Lihat Semua
          </Button>
        </div>
      ) : (
        <>
          {/* Grid produk */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showKategoriBadge={showKategoriBadge}
                onKlikCard={onKlikProduk}
              />
            ))}
          </div>

          {/* Tombol "Lihat Lebih Banyak" — hanya tampil kalau masih ada produk tersembunyi */}
          {filteredProducts.length > displayCount && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => setDisplayCount((prev) => prev + 8)}
              >
                Lihat Lebih Banyak
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
