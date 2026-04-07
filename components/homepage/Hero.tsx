"use client"

// Komponen hero homepage — banner placeholder + judul + 3 langkah + tombol CTA
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface HeroProps {
  onPasangOrderClick: () => void
}

// Data 3 langkah cara kerja platform
const LANGKAH = [
  {
    nomor: 1,
    judul: 'Pasang Order',
    deskripsi: 'Tulis kebutuhan & budget',
  },
  {
    nomor: 2,
    judul: 'Mitra Bersaing',
    deskripsi: 'Mitra lokal kirim penawaran',
  },
  {
    nomor: 3,
    judul: 'Diproses Otomatis',
    deskripsi: 'Sistem pilih terbaik untuk Anda',
  },
]

export default function Hero({ onPasangOrderClick }: HeroProps) {
  // Scroll ke section product grid saat klik "Jelajahi Jasa"
  const handleJelajahi = () => {
    const el = document.querySelector('#product-grid')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section style={{ backgroundColor: '#e6f1fb' }}>
      {/* Area banner placeholder — Sprint 2 akan diganti slider */}
      <div
        style={{ backgroundColor: '#e6f1fb', height: '80px' }}
        aria-hidden="true"
      />

      {/* Konten hero */}
      <div className="py-10 px-4 text-center">
        {/* Judul utama */}
        <h1 className="text-2xl md:text-3xl font-semibold leading-snug">
          Pasang kebutuhan,
        </h1>
        <h1 className="text-2xl md:text-3xl font-semibold leading-snug">
          biarkan mitra bersaing
        </h1>

        {/* Subjudul */}
        <p className="text-sm md:text-base text-muted-foreground mt-2 mb-6 max-w-md mx-auto">
          Tulis kebutuhan dan budget — mitra lokal kirim penawaran, sistem pilihkan yang terbaik
        </p>

        {/* 3 kotak langkah */}
        <div className="grid grid-cols-3 gap-3 max-w-[600px] mx-auto mb-6">
          {LANGKAH.map((langkah) => (
            <Card key={langkah.nomor} className="bg-white border">
              <CardContent className="p-4 text-center">
                {/* Nomor lingkaran biru */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-semibold mx-auto mb-2"
                  style={{ backgroundColor: '#185FA5' }}
                >
                  {langkah.nomor}
                </div>
                <p className="text-sm font-medium leading-tight">{langkah.judul}</p>
                <p className="text-xs text-muted-foreground mt-1">{langkah.deskripsi}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tombol CTA */}
        <div className="flex gap-3 justify-center flex-wrap">
          <Button
            style={{ backgroundColor: '#185FA5' }}
            onClick={onPasangOrderClick}
          >
            Pasang Order — Gratis
          </Button>
          <Button variant="outline" onClick={handleJelajahi}>
            Jelajahi Jasa
          </Button>
        </div>
      </div>
    </section>
  )
}
