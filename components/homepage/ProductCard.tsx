"use client"

// Komponen kartu produk/jasa — digunakan dalam grid di homepage
import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

// Tipe data produk — diekspor agar bisa dipakai di ProductGrid
export interface Product {
  id: string
  nama: string
  kategori: string
  harga: number
  foto_url: string
}

interface ProductCardProps {
  product: Product
  showKategoriBadge: boolean  // true saat filter 'Semua', false saat filter spesifik
  onKlikCard: () => void      // parent yang handle cek login
}

export default function ProductCard({ product, showKategoriBadge, onKlikCard }: ProductCardProps) {
  // State untuk menangani error loading gambar
  const [imgError, setImgError] = useState(false)

  // Format harga ke format Rupiah Indonesia
  const hargaFormatted = 'Rp ' + product.harga.toLocaleString('id-ID')

  return (
    <div
      className="border rounded-lg overflow-hidden cursor-pointer transition hover:shadow-md bg-white"
      onClick={onKlikCard}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onKlikCard()}
      aria-label={`${product.nama} — ${hargaFormatted}`}
    >
      {/* Area foto produk */}
      <div className="relative h-40 overflow-hidden bg-gray-100">
        {!imgError && product.foto_url ? (
          <Image
            src={product.foto_url}
            alt={product.nama}
            fill
            className="object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          // Placeholder abu-abu kalau foto tidak ada atau error
          <div className="w-full h-full bg-gray-200" aria-hidden="true" />
        )}

        {/* Badge kategori — hanya tampil saat filter 'Semua' */}
        {showKategoriBadge && (
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className="bg-white/90 text-gray-700 text-xs"
            >
              {product.kategori}
            </Badge>
          </div>
        )}
      </div>

      {/* Info produk */}
      <div className="p-3">
        {/* Nama produk — maksimal 2 baris */}
        <p className="text-sm font-medium line-clamp-2 leading-snug mb-1">
          {product.nama}
        </p>
        {/* Harga — tidak ada rating, nama vendor, atau nama toko */}
        <p className="text-base font-semibold" style={{ color: '#185FA5' }}>
          {hargaFormatted}
        </p>
      </div>
    </div>
  )
}
