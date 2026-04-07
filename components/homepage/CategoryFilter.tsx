"use client"

// Komponen filter kategori — horizontal scroll, setiap item berupa pill yang bisa diklik
interface CategoryFilterProps {
  activeKategori: string
  onKategoriChange: (kategori: string) => void
}

// Daftar kategori yang tersedia — data statis untuk fondasi ini
const KATEGORI = [
  'Semua',
  'Bunga Papan',
  'Bersih Rumah',
  'Jasa Kirim',
  'Servis AC',
  'Servis Elektronik',
  'Katering',
  'Foto & Video',
  'Renovasi',
  'Pijat & Relaksasi',
]

export default function CategoryFilter({ activeKategori, onKategoriChange }: CategoryFilterProps) {
  return (
    // Wrapper dengan horizontal scroll, sembunyikan scrollbar
    <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex gap-2 px-4 py-3 border-b min-w-max">
        {KATEGORI.map((kategori) => {
          const isAktif = kategori === activeKategori

          return (
            <button
              key={kategori}
              onClick={() => onKategoriChange(kategori)}
              className={[
                'px-4 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap',
                isAktif
                  ? 'text-white border-blue-600'
                  : 'bg-white text-muted-foreground border-gray-200 hover:bg-gray-50',
              ].join(' ')}
              style={isAktif ? { backgroundColor: '#185FA5' } : undefined}
            >
              {kategori}
            </button>
          )
        })}
      </div>
    </div>
  )
}
