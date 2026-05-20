// lib/hooks/useLoginFlow.ts
// Hook utama state machine login — state + orchestration.
// UI components di app/login/components/ hanya render — tidak ada logic bisnis.
//
// REFACTOR Sesi #055: API calls → loginApiCalls.ts; Session helpers → loginSessionHelpers.ts
// REFACTOR Sesi #062: Hapus Biometric dari login flow
// REFACTOR Sesi #068: loginUnifiedAction — 1 signInWithPassword semua role
// FIX Sesi #074: handle sesiParalelAda dari loginUnifiedAction
// FIX S#183a: tambah role eksplisit; fix 2 bypass path SA; refactor Vendor → lanjutSetelahRole
// FIX S#183d: handleLogin kondisi result.ok && result.uid (tanpa result.redirectTo)
// FIX S#183e: selesaiLogin hapus otp_pending cookie setelah OTP diverifikasi
//   loginUnifiedAction set otp_pending=1 untuk SA OTP=required
//   middleware Guard 5 baca cookie ini → redirect /login jika ada
//   selesaiLogin hapus cookie → dashboard bisa diakses setelah OTP verified
// FIX S#185: handleLogin — percaya result.redirectTo dari server sebagai indikator OTP=disabled
//   Bukan re-check configLogin['require_otp_superadmin'] yang undefined di login publik (RLS)
//   Regresi dari S#184 HUTANG-SA-CONFIG-SEPARATION

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams }               from 'next/navigation'
import { createBrowserSupabaseClient }              from '@/lib/supabase-client'
import { getGPSLocation }                           from '@/lib/session-client'
import { useOTPTimer }                              from '@/lib/hooks/useOTPTimer'
import { ROLES }                                    from '@/lib/constants'
import {
  DEFAULT_PESAN, SUPABASE_ERROR_KEYS,
  decodeJwtPayload, extractConfigItems, findConfigValue,
  parseRequireOtpForRole, getRequireOtpConfigKey,
} from '@/app/login/login-types'
import type { Tahap, DataSesiParalel } from '@/app/login/login-types'

import { loginUnifiedAction } from '@/app/login/actions'

import {
  fetchCheckLock, fetchLockAccount, fetchUnlockAccount,
  fetchCheckSession, fetchSendOTP, fetchVerifyOTP,
  fetchSessionLog, fetchUserPresence, fetchActivityLog,
  fetchLoadUserProfile,
} from './login/loginApiCalls'

import {
  ambilNamaSuperadmin, tulisSessionLogSuperadmin,
  aturCookieSession, hitungTujuanRedirect, kirimActivityLoginBerhasil,
} from './login/loginSessionHelpers'
import { SESSION_DEFAULT_TIMEOUT_MINUTES } from '@/lib/auth'

// (snapshot pre-Step6 S#191 — file utuh, tidak ada perubahan)
// Perubahan Step 6: hanya tambah komentar di blok result.redirectTo di handleLogin
