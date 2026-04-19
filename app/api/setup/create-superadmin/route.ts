// app/api/setup/create-superadmin/route.ts
// POST — Buat akun SuperAdmin pertama saat platform baru disetup.
// Hanya bisa dipanggil sekali — setelah ada SuperAdmin, endpoint ini ditolak.
//
// PERUBAHAN dari versi Firebase:
//   - Hapus Firebase Admin initAdmin(), getAuth(), getFirestore()
//   - Buat user → Supabase Auth admin.createUser()
//   - Simpan profil → tabel users PostgreSQL
//   - Custom claims (role SUPERADMIN) → otomatis via Edge Function inject-custom-claims
//   - Cek setup_complete → cek tabel users (ada SuperAdmin atau tidak)

import { NextRequest, NextResponse }  from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const db = createServerSupabaseClient()

    // Cek apakah setup sudah pernah dilakukan
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('role', 'SUPERADMIN')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { message: 'Setup sudah selesai. Akses ditolak.' },
        { status: 403 }
      )
    }

    // Ambil dan validasi input
    const { nama, email, password, setupKey } = await request.json()

    if (!nama || !email || !password || !setupKey) {
      return NextResponse.json(
        { message: 'Semua field wajib diisi.' },
        { status: 400 }
      )
    }

    if (setupKey !== process.env.SETUP_KEY) {
      return NextResponse.json(
        { message: 'Setup key tidak valid.' },
        { status: 401 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password minimal 8 karakter.' },
        { status: 400 }
      )
    }

    // Buat user di Supabase Auth via Admin API
    // email_confirm: true → langsung aktif tanpa perlu konfirmasi email
    // app_metadata.app_role wajib diisi di sini — getUser() di middleware membaca dari database,
    // bukan dari JWT payload. Edge Function inject-custom-claims hanya menambahkan ke JWT payload.
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama },
      app_metadata:  { app_role: 'SUPERADMIN' },
    })

    if (authError || !authData.user) {
      if (authError?.message?.includes('already been registered')) {
        return NextResponse.json(
          { message: 'Email sudah digunakan. Gunakan email lain.' },
          { status: 400 }
        )
      }
      throw authError ?? new Error('Gagal membuat user Supabase Auth')
    }

    const userId = authData.user.id

    // Simpan data SuperAdmin ke tabel users
    // Role SUPERADMIN di app_metadata akan diisi otomatis
    // oleh Edge Function inject-custom-claims saat JWT diterbitkan
    const { error: insertError } = await db
      .from('users')
      .insert({
        id:               userId,
        email,
        nama,
        role:             'SUPERADMIN',
        is_platform_owner: true,
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })

    if (insertError) {
      // Kalau insert gagal, hapus user Auth agar tidak orphan
      await db.auth.admin.deleteUser(userId)
      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: 'Akun SuperAdmin berhasil dibuat.',
    })

  } catch (error: unknown) {
    console.error('[setup] Error:', error)
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server.'
    return NextResponse.json({ message }, { status: 500 })
  }
}