// app/api/auth/set-custom-claims/route.ts
// OBSOLETE — Dengan Supabase, custom claims diset otomatis via
// Custom Access Token Hook (Edge Function inject-custom-claims) saat JWT diterbitkan.
// Route ini dipertahankan agar tidak ada 404, tapi tidak melakukan apapun.
//
// MIGRASI Sesi #037: Firebase custom claims → Supabase JWT Hook

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Custom claims dikelola otomatis oleh Supabase JWT Hook',
  })
}
