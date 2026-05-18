'use server'

// app/auth/logout-action.ts
// Server action logout — dipakai semua role (SA, Vendor, AdminTenant, Customer).
// Dibuat: Sesi #062 — LANGKAH 3 (Shared Logout Function)
//
// MENGGANTIKAN pola lama:
//   Client → /api/auth/logout (POST) → supabase.signOut() client → hapus cookie manual → window.location.href
//
// POLA BARU (server action):
//   Client → logoutAction() → signOut server-side → hapus cookie server-side → redirect('/login')
//   Background via after(): markLogout (session_logs) + setUserOffline (presence) + writeActivityLog
//
// CATATAN redirect():
//   redirect() dari server action melakukan full page navigation — bukan soft navigation.
//   Aman dari masalah Supabase client cache yang terjadi saat router.push() (baca lib/auth.ts).
//
// DIPAKAI OLEH: DashboardHeader.tsx (SA), vendor/page.tsx (Vendor)
//   Semua role pakai 1 fungsi — tidak ada duplikasi (ATURAN 11).

import { redirect }        from 'next/navigation'
import { after }           from 'next/server'
import { buatSupabaseSSR } from '@/app/login/login-action-helpers'
import { markLogout }      from '@/lib/services/session.service'
import {
  setUserOffline,
  writeActivityLog,
} from '@/lib/services/activity.service'

// Cookie yang dihapus — sinkron dengan SESSION_COOKIES di lib/auth.ts
// Jika SESSION_COOKIES di lib/auth.ts berubah, update juga di sini.
const COOKIES_LOGOUT = [
  'session_role',
  'session_tenant',
  'gps_kota',
  'session_login_at',
  'user_role',
  'tenant_id',
  'session_timeout_minutes',
  'session_last_active',
] as const

export async function logoutAction(): Promise<void> {
  const { supabase, cookieStore } = await buatSupabaseSSR()

  // Baca data dari cookies sebelum dihapus
  const role     = cookieStore.get('session_role')?.value   ?? ''
  const tenantId = cookieStore.get('session_tenant')?.value ?? ''
  const gpsKota  = cookieStore.get('gps_kota')?.value       ?? ''

  // Ambil UID dari Supabase session server-side (sebelum signOut)
  const { data: { user } } = await supabase.auth.getUser()
  const uid = user?.id ?? ''

  // Invalidasi Supabase session server-side
  await supabase.auth.signOut()

  // Hapus semua session cookies server-side
  COOKIES_LOGOUT.forEach(name => {
    try { cookieStore.delete(name) } catch { /* abaikan jika cookie tidak ada */ }
  })

  // Background tasks via after() — jalan setelah response/redirect dikirim ke client
  if (uid) {
    after(async () => {
      // Tandai session_logs sebagai logout
      await markLogout(uid)

      // Set user offline di user_presence
      await setUserOffline(uid, tenantId || null)

      // Catat activity_log logout
      await writeActivityLog({
        uid,
        tenant_id:     tenantId,
        nama:          '',
        role,
        session_id:    '',
        action_type:   'FORM_SUBMIT',
        module:        'AUTH',
        page:          '/login',
        action_detail: 'Logout berhasil',
        result:        'SUCCESS',
        device:        'Unknown',
        gps_kota:      gpsKota,
      })
    })
  }

  // Full page navigation ke login — aman dari Supabase client cache issue
  redirect('/login')
}
