// app/api/auth/warmup-login-action/route.ts
// Endpoint warmup khusus untuk Server Action bundle loginUnifiedAction.
// Dibuat: Sesi #188 — fix BUG-021 cold start login 32s.
//
// Tujuan: import semua modul yang dipakai loginUnifiedAction agar Vercel
// Server Action bundle ter-inisialisasi via keep-warm cron — bukan menunggu
// user pertama klik Submit.
//
// TIDAK eksekusi side-effect (tidak panggil signInWithPassword).
// TIDAK ada akses DB.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAccountLock } from '@/lib/services/account-lock.service'
import { getConfigValues, parseConfigNumber } from '@/lib/config-registry'
import {
  decodeAppClaims, setCookiesLoginServer, buatSupabaseSSR,
  buildLoginFormSchema, jalankanAfterTasksLogin, prosesGagalLogin,
} from '@/app/login/login-action-helpers'

export async function GET() {
  // Trigger module-level initialization tanpa eksekusi aktual
  void createServerSupabaseClient
  void getAccountLock
  void getConfigValues
  void parseConfigNumber
  void decodeAppClaims
  void setCookiesLoginServer
  void buatSupabaseSSR
  void buildLoginFormSchema
  void jalankanAfterTasksLogin
  void prosesGagalLogin

  return NextResponse.json(
    { status: 'warm', bundle: 'login-action', timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  )
}
