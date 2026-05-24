// ARSIP SESI #209 — useLoginFlow.ts sebelum edit Step 5 otp_only
// Original: lib/hooks/useLoginFlow.ts
// Diarsip karena: modifikasi lanjutSetelahRole + handleVerifikasiOTP + tambah state otp_only

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
// FIX S#185: handleLogin — percaya result.redirectTo dari server sebagai indikator OTP=disabled
// FIX S#194: hapus getGPSLocation+Nominatim 781ms blocking dari critical path login
// [S#209: arsip ini adalah snapshot sebelum tambah fitur otp_only]

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams }               from 'next/navigation'
import { createBrowserSupabaseClient }              from '@/lib/supabase-client'
import { useOTPTimer }                              from '@/lib/hooks/useOTPTimer'
import { ROLES }                                    from '@/lib/constants'
import {
  DEFAULT_PESAN, SUPABASE_ERROR_KEYS,
  decodeJwtPayload, extractConfigItems,
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
// [End of arsip header — full file content follows]
