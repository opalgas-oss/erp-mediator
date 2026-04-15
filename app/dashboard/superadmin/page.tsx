// app/dashboard/superadmin/page.tsx
// Halaman utama Dashboard SuperAdmin — Server Component
// Ini placeholder — konten lengkap dikerjakan di Sprint 2

import { redirect }  from 'next/navigation'
import { verifyJWT } from '@/lib/auth-server'

// ─── Label Teks ───────────────────────────────────────────────────────────────
const LABEL_JUDUL    = 'Dashboard SuperAdmin'
const LABEL_SAMBUTAN = 'Selamat datang,'

// ─── Halaman ──────────────────────────────────────────────────────────────────
export default async function SuperAdminPage() {
  // Cek sesi lagi di level page — defense in depth di balik layout
  const payload = await verifyJWT()

  if (!payload || payload.role !== 'SUPERADMIN') {
    redirect('/login')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        {LABEL_JUDUL}
      </h1>
      <p className="text-sm text-gray-500">
        {LABEL_SAMBUTAN}{' '}
        <span className="font-medium text-gray-700">{payload.displayName}</span>
      </p>
    </div>
  )
}
