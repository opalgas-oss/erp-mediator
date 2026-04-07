"use client"

// Komponen footer homepage — berisi logo, tagline, dan link CTA bagi yang belum login
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Decode JWT dari cookie untuk cek apakah user sudah login
function isLoggedIn(): boolean {
  try {
    const cookies = document.cookie.split(';')
    const sessionCookie = cookies.find((c) => c.trim().startsWith('session='))
    if (!sessionCookie) return false

    const token = sessionCookie.split('=')[1]?.trim()
    if (!token) return false

    // Ambil payload JWT (bagian tengah)
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return false

    // Decode dan cek kalau payload valid
    const payload = JSON.parse(atob(payloadBase64))
    return !!payload.role
  } catch {
    return false
  }
}

export default function Footer() {
  const router = useRouter()
  // State login — cek setelah komponen mount agar tidak ada hydration mismatch
  const [sudahLogin, setSudahLogin] = useState(false)

  useEffect(() => {
    setSudahLogin(isLoggedIn())
  }, [])

  return (
    <footer className="border-t bg-white px-4 md:px-6 py-6">
      {/* Baris 1: logo + tagline di kiri, link CTA di kanan */}
      <div className="flex justify-between items-center">
        {/* Kiri: logo dan tagline */}
        <div>
          <p className="text-sm font-bold text-muted-foreground">▲ Mediator</p>
          <p className="text-xs text-muted-foreground">Platform Jasa Terpercaya Indonesia</p>
        </div>

        {/* Kanan: link untuk user yang belum login */}
        {!sudahLogin && (
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/register?tab=vendor')}
              className="text-sm text-muted-foreground hover:underline"
            >
              Daftar sebagai Mitra
            </button>
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-muted-foreground hover:underline"
            >
              Masuk
            </button>
          </div>
        )}
      </div>

      {/* Baris 2: copyright */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        © 2026 Mediator. All rights reserved.
      </p>
    </footer>
  )
}
