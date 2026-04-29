// ARSIP SESI #075 — login-action-helpers.ts SEBELUM custom access token hook
// Lihat versi aktual di app/login/login-action-helpers.ts
// app/login/login-action-helpers.ts
// Shared helper functions untuk semua login server actions.
//
// ATURAN: File ini TIDAK boleh pakai 'use client' atau 'use server'.
//         Dipanggil dari dalam server action — berjalan di server context.
//
// BERISI:
//   A. decodeAppClaims()            — decode JWT access token → role + tenantId
//   B. mapSupabaseErrorKey()        — map error Supabase → key message_library
//   C. formatLockUntilWIB()         — format ISO timestamp → "HH.mm WIB"
//   D. hitungTujuanRedirectServer() — URL dashboard sesuai role
//   E. setCookiesLoginServer()      — set 4 session cookies (terima cookieStore dari luar)
//   F. jalankanAfterTasksLogin()    — 3 background tasks via after()
//   G. buildLoginFormSchema()       — Zod schema validasi input login
//   H. buatSupabaseSSR()            — buat Supabase SSR client + return cookieStore
//   I. prosesGagalLogin()           — increment lock + kirim WA notif + return error key
//   J. ambilNamaUser()              — query nama user dari tabel users (SA only)
//
// FIX REGRESI Sesi #060:
//   cookies() hanya boleh dipanggil SEKALI per request — di buatSupabaseSSR().
//
// FIX BUG-011 Sesi #063:
//   prosesGagalLogin() sebelumnya hanya query tabel users → Vendor/AdminTenant/Customer tidak ditemukan.

import { cookies }                from 'next/headers'
import { after }                  from 'next/server'
import { z }                      from 'zod'
import { createServerClient }     from '@supabase/ssr'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { createServerSupabaseClient }  from '@/lib/supabase-server'
import { create as createSessionLog }  from '@/lib/repositories/session-log.repository'
import { updateUserPresence }          from '@/lib/services/activity.service'
import {
  unlockAccount,
  incrementLockCount,
  sendLockNotificationWA,
} from '@/lib/services/account-lock.service'
import {
  findByEmail as findUserByEmail,
  findSuperAdminEmail,
} from '@/lib/repositories/user.repository'
import { getPlatformTimezone, getConfigValues, parseConfigNumber } from '@/lib/config-registry'
import { ROLES, UNLOCK_METHOD } from '@/lib/constants'

export interface AppClaims {
  role:     string
  tenantId: string
}

export function decodeAppClaims(token: string): AppClaims {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { role: '', tenantId: '' }
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as Record<string, unknown>
    return {
      role:     typeof claims['app_role']  === 'string' ? claims['app_role']  : '',
      tenantId: typeof claims['tenant_id'] === 'string' ? claims['tenant_id'] : '',
    }
  } catch {
    return { role: '', tenantId: '' }
  }
}
