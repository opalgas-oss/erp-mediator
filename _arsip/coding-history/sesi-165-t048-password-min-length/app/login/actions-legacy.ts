// app/login/actions-legacy.ts — PRE-T-048 SNAPSHOT (S#165)
// BUG T-048: buildLoginFormSchema() dipanggil tanpa arg → default 8 selalu
// Server Actions login — Legacy actions (backward compatibility).
'use server'

import { createServerSupabaseClient }  from '@/lib/supabase-server'
import { getAccountLock }              from '@/lib/services/account-lock.service'
import { ROLES, ACCOUNT_LOCK_STATUS }  from '@/lib/constants'
import {
  decodeAppClaims, formatLockUntilWIB, hitungTujuanRedirectServer,
  setCookiesLoginServer, jalankanAfterTasksLogin, ambilNamaUser,
  buildLoginFormSchema, buatSupabaseSSR, prosesGagalLogin,
} from './login-action-helpers'
import type { LoginActionParams, LoginActionResult } from './actions'

// BUG T-048: buildLoginFormSchema() selalu default 8 — tidak baca config
// loginSuperadminAction — Legacy
// loginVendorAction — Legacy
// loginAdminTenantAction — Legacy
