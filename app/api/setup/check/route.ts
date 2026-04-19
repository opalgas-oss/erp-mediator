// app/api/setup/check/route.ts
// GET — Cek apakah setup SuperAdmin sudah pernah dilakukan.
// Dipakai oleh halaman /init-philipsliemena untuk memutuskan apakah form ditampilkan.
//
// PERUBAHAN dari versi Firebase:
//   - Hapus Firebase Admin initAdmin() dan getFirestore()
//   - Cek platform_config/settings di Firestore → cek tabel users di PostgreSQL
//   - Setup dianggap selesai kalau ada minimal 1 row di tabel users

import { NextResponse }               from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const db = createServerSupabaseClient()

    // Cek apakah sudah ada SuperAdmin di tabel users
    const { data, error } = await db
      .from('users')
      .select('id')
      .eq('role', 'SUPERADMIN')
      .limit(1)

    if (error) throw error

    const is_setup_complete = data !== null && data.length > 0

    return NextResponse.json({ is_setup_complete })

  } catch {
    // Kalau error, anggap belum setup agar halaman init bisa diakses
    return NextResponse.json({ is_setup_complete: false })
  }
}