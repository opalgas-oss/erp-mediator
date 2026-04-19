'use client'

// app/register/page.tsx
// Halaman pendaftaran — Sprint 1 fokus pada Login SuperAdmin
// Registrasi Customer & Vendor akan diimplementasi di TAHAP 4
//
// MIGRASI Sesi #037: Hapus semua import Firebase — placeholder sampai TAHAP 4

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1">
            <span className="text-blue-700 font-semibold text-lg">M</span>
          </div>
          <CardTitle className="text-center text-lg font-semibold text-gray-900">
            Pendaftaran
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            ERP Mediator Hyperlocal
          </p>
        </CardHeader>
        <CardContent className="pb-6 space-y-4 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-700">
              Fitur pendaftaran Customer dan Vendor sedang dalam pengembangan.
              Akan tersedia segera.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700">
              Masuk di sini
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
