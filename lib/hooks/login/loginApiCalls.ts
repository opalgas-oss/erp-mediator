// lib/hooks/login/loginApiCalls.ts
// Pure async functions — semua fetch() ke /api/auth/* dari login flow.
// Tidak ada React state. Tidak ada side effect selain fetch.
//
// Dipecah dari lib/hooks/useLoginFlow.ts (Sesi #055 — H-03 split).
// Tujuan: memisahkan API calls dari state management agar mudah diedit.
//
// ARSITEKTUR:
//   useLoginFlow.ts → import dari sini → fetch ke /api/auth/*
//   Semua fungsi di sini = pure async, bisa di-test tanpa React

'use client'

import { getDeviceInfo } from '@/lib/session-client'

// ─── Tipe Parameter ──────────────────────────────────────────────────────────

export interface ParamCheckLock {
  email: string
}

export interface ParamLockAccount {
  email:    string
  tenantId: string | null
}

export interface ParamUnlockAccount {
  uid:      string
  tenantId: string | null
  email?:   string
  method:   'auto' | 'manual'
}

export interface ParamCheckSession {
  uid:      string
  tenantId: string
  role?:    string
}

export interface ParamSendOTP {
  uid:      string
  tenantId: string
  role:     string
  nomorWa:  string
  nama?:    string
}

export interface ParamVerifyOTP {
  uid:       string
  tenantId:  string
  inputCode: string
}

export interface ParamSessionLog {
  uid:       string
  tenantId:  string | null
  role:      string
  gpsKota:   string
  sessionId?: string  // opsional — jika diisi, server pakai ID ini (tanpa round-trip generate)
}

export interface ParamUserPresence {
  uid:              string
  tenantId:         string | null
  nama:             string
  role:             string
  currentPage:      string
  currentPageLabel: string
}

export interface ParamActivityLog {
  uid:          string
  tenantId:     string
  nama:         string
  role:         string
  sessionId:    string
  actionType:   'PAGE_VIEW' | 'BUTTON_CLICK' | 'FORM_SUBMIT' | 'FORM_ERROR' | 'API_CALL'
  module:       string
  page:         string
  pageLabel:    string
  actionDetail: string
  result:       'SUCCESS' | 'FAILED' | 'BLOCKED'
  gpsKota:      string
}

// ─── FUNGSI: fetchCheckLock ──────────────────────────────────────────────────
/**
 * Cek apakah akun dikunci — panggil /api/auth/check-lock.
 * @param params - email user
 * @returns locked, lock_until_wib, had_attempts
 */
export async function fetchCheckLock(params: ParamCheckLock) {
  const res  = await fetch('/api/auth/check-lock', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: params.email }),
  })
  return res.json()
}

// ─── FUNGSI: fetchLockAccount ────────────────────────────────────────────────
/**
 * Catat percobaan login gagal — panggil /api/auth/lock-account.
 * @param params - email, tenantId
 * @returns locked, count, lock_until_wib
 */
export async function fetchLockAccount(params: ParamLockAccount) {
  const res = await fetch('/api/auth/lock-account', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: params.email, tenant_id: params.tenantId }),
  })
  return res.json()
}

// ─── FUNGSI: fetchUnlockAccount ──────────────────────────────────────────────
/**
 * Buka kunci akun (auto setelah login berhasil) — fire-and-forget.
 * @param params - uid, tenantId, email (opsional), method
 */
export function fetchUnlockAccount(params: ParamUnlockAccount): void {
  fetch('/api/auth/unlock-account', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: params.uid, tenant_id: params.tenantId,
      email: params.email, method: params.method,
    }),
  }).catch(err => console.error('[loginApiCalls] unlock-account gagal:', err))
}

// ─── FUNGSI: fetchCheckSession ───────────────────────────────────────────────
/**
 * Cek sesi paralel sebelum login selesai — /api/auth/check-session.
 * @param params - uid, tenantId
 * @returns hasActiveSession, blocked, sessionData
 */
export async function fetchCheckSession(params: ParamCheckSession) {
  const res = await fetch('/api/auth/check-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: params.uid, tenant_id: params.tenantId, role: params.role }),
  })
  return res.json()
}

// ─── FUNGSI: fetchSendOTP ────────────────────────────────────────────────────
/**
 * Kirim OTP via WhatsApp — /api/auth/send-otp.
 * @param params - uid, tenantId, role, nomorWa, nama
 * @returns success, otp_expiry_minutes, otp_max_attempts, resend_cooldown_seconds
 */
export async function fetchSendOTP(params: ParamSendOTP) {
  const res = await fetch('/api/auth/send-otp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: params.uid, tenant_id: params.tenantId,
      role: params.role, nomor_wa: params.nomorWa, nama: params.nama ?? '',
    }),
  })
  return res.json()
}

// ─── FUNGSI: fetchVerifyOTP ──────────────────────────────────────────────────
/**
 * Verifikasi kode OTP — /api/auth/verify-otp.
 * @param params - uid, tenantId, inputCode
 * @returns success, result ('OK'|'EXPIRED'|'WRONG'|'NOT_FOUND'|'ALREADY_USED')
 */
export async function fetchVerifyOTP(params: ParamVerifyOTP) {
  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: params.uid, tenant_id: params.tenantId, input_code: params.inputCode,
    }),
  })
  return res.json()
}

// ─── FUNGSI: fetchSessionLog ─────────────────────────────────────────────────
/**
 * Tulis session log saat login berhasil — /api/auth/session-log.
 * OPTIMASI Sesi #076: terima sessionId dari client agar tidak perlu tunggu server generate.
 * @param params - uid, tenantId, role, gpsKota, sessionId (opsional)
 * @returns success, session_id
 */
export async function fetchSessionLog(params: ParamSessionLog) {
  const res = await fetch('/api/auth/session-log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: params.uid, tenant_id: params.tenantId,
      role: params.role, device: getDeviceInfo(), gps_kota: params.gpsKota,
      session_id: params.sessionId,  // opsional — server pakai ini jika tersedia
    }),
  })
  return res.json()
}

// ─── FUNGSI: fetchUserPresence ───────────────────────────────────────────────
/**
 * Update posisi user — /api/auth/user-presence.
 * @param params - uid, tenantId, nama, role, currentPage, currentPageLabel
 * @returns Promise (awaitable untuk skenario non-fire-and-forget)
 */
export async function fetchUserPresence(params: ParamUserPresence): Promise<void> {
  await fetch('/api/auth/user-presence', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: params.uid, tenant_id: params.tenantId,
      nama: params.nama, role: params.role,
      device: getDeviceInfo(),
      current_page: params.currentPage, current_page_label: params.currentPageLabel,
    }),
  })
}

// ─── FUNGSI: fetchLoadUserProfile ──────────────────────────────────────────────
/**
 * Muat profil user dari server — dipakai SEMUA role non-SUPERADMIN saat login.
 * Menggantikan query Supabase langsung dari browser (lambat + melanggar arsitektur).
 * @param uid - UID user dari JWT
 * @param tenantId - Tenant ID dari JWT
 * @returns nama, nomor_wa, role, status
 */
export async function fetchLoadUserProfile(uid: string, tenantId: string | null) {
  const res = await fetch('/api/auth/load-user-profile', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, tenant_id: tenantId }),
  })
  return res.json()
}

// ─── FUNGSI: fetchActivityLog ────────────────────────────────────────────────
/**
 * Kirim activity log — /api/auth/activity-log. Fire-and-forget.
 * @param params - data lengkap activity log
 */
export function fetchActivityLog(params: ParamActivityLog): void {
  fetch('/api/auth/activity-log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: params.uid, tenant_id: params.tenantId,
      nama: params.nama, role: params.role,
      session_id: params.sessionId,
      action_type: params.actionType, module: params.module,
      page: params.page, page_label: params.pageLabel,
      action_detail: params.actionDetail,
      result: params.result, device: getDeviceInfo(), gps_kota: params.gpsKota,
    }),
  }).catch(() => {})
}
