'use client'

// app/dashboard/page.tsx
// Redirect otomatis ke /login — setiap role punya dashboard sendiri
// Customer → /dashboard/customer
// Vendor   → /dashboard/vendor
// Admin    → /dashboard/admin
// SuperAdmin → /dashboard/superadmin
// Routing ditangani middleware.ts berdasarkan JWT role
//
// MIGRASI Sesi #037: hapus import Firebase, ganti dengan redirect

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-500">Mengalihkan...</p>
    </div>
  )
}
