// app/login/components/shared.tsx
// Komponen UI bersama untuk semua tahap login
// Dipindah dari login/page.tsx monolith — Sesi #049

'use client'

import { Card } from '@/components/ui/card'

// ─── Wrapper utama ───────────────────────────────────────────────────────────
export function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  )
}

// ─── Spinner loading ─────────────────────────────────────────────────────────
export function SpinnerBiru() {
  return (
    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
  )
}

// ─── Kotak error merah ───────────────────────────────────────────────────────
export function KotakError({ pesan }: { pesan: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
      {pesan}
    </div>
  )
}
