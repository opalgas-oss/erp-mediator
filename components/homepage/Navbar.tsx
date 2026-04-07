"use client"

// Komponen navbar homepage — sticky di atas, berisi logo, lokasi GPS, dan tombol aksi
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface NavbarProps {
  onPasangOrderClick: () => void
}

// Decode JWT dari cookie untuk ambil field role
function getRoleFromCookie(): string | null {
  try {
    const cookies = document.cookie.split(';')
    const sessionCookie = cookies.find((c) => c.trim().startsWith('session='))
    if (!sessionCookie) return null

    const token = sessionCookie.split('=')[1]?.trim()
    if (!token) return null

    // Ambil bagian payload (index 1) dari JWT
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return null

    const payload = JSON.parse(atob(payloadBase64))
    return payload.role ?? null
  } catch {
    // Kalau decode gagal, anggap belum login
    return null
  }
}

export default function Navbar({ onPasangOrderClick }: NavbarProps) {
  const router = useRouter()

  // State nama kota dari GPS
  const [kotaLabel, setKotaLabel] = useState<string | null>(null)
  const [loadingKota, setLoadingKota] = useState(true)

  // Deteksi kota via navigator.geolocation + Nominatim API
  useEffect(() => {
    if (!navigator.geolocation) {
      setKotaLabel('Indonesia')
      setLoadingKota(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          // Ambil nama kota dari berbagai field yang tersedia
          const kota =
            data?.address?.city ||
            data?.address?.county ||
            data?.address?.state ||
            'Indonesia'
          setKotaLabel(kota)
        } catch {
          // Kalau fetch gagal, tampilkan fallback
          setKotaLabel('Indonesia')
        } finally {
          setLoadingKota(false)
        }
      },
      () => {
        // Kalau GPS ditolak atau error
        setKotaLabel('Indonesia')
        setLoadingKota(false)
      },
      { timeout: 5000 }
    )
  }, [])

  // Handler tombol "Pasang Order" — cek role sebelum aksi
  const handlePasangOrder = () => {
    const role = getRoleFromCookie()

    if (!role) {
      // Belum login → buka modal login
      onPasangOrderClick()
      return
    }

    if (role === 'CUSTOMER') {
      // Pelanggan boleh pasang order — placeholder Sprint 4
      router.push('/order/baru')
      return
    }

    // Vendor/Admin/SuperAdmin tidak boleh pasang order
    toast.error('Fitur ini untuk pelanggan')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-4 md:px-6 py-3">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="text-lg font-bold tracking-tight shrink-0"
          style={{ color: '#185FA5' }}
        >
          ▲ Mediator
        </button>

        {/* GPS Kota Badge */}
        {loadingKota ? (
          <Skeleton className="h-5 w-24 rounded-full" />
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground cursor-default">
            ● {kotaLabel} ▾
          </Badge>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Link Daftar sebagai Mitra */}
        <Button
          variant="link"
          size="sm"
          className="hidden md:inline-flex text-muted-foreground"
          onClick={() => router.push('/register?tab=vendor')}
        >
          Daftar sebagai Mitra
        </Button>

        {/* Tombol Masuk */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/login')}
        >
          Masuk
        </Button>

        {/* Tombol Pasang Order */}
        <Button
          size="sm"
          style={{ backgroundColor: '#185FA5' }}
          onClick={handlePasangOrder}
        >
          Pasang Order
        </Button>
      </div>
    </nav>
  )
}
