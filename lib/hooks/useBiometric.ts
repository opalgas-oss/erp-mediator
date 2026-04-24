// lib/hooks/useBiometric.ts
// React hook untuk WebAuthn biometric — register + verify trusted device.
// Diekstrak dari lib/session.ts sesuai ANALISIS v3 Step 5 TAHAP C.
// Dibuat: Sesi #052 — BLOK D-03 TODO_ARSITEKTUR_LAYER_v1
//
// FUNGSI YANG DIPINDAHKAN:
//   - registerBiometric() dari session.ts → useBiometric().register()
//   - verifyBiometric()   dari session.ts → useBiometric().verify()
//
// Hook ini client-side only — TIDAK import 'server-only'.
// Config trusted_device_days dibaca via /api/config/security_login.

'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { getDeviceInfo } from '@/lib/session-client'

// ─── Tipe ────────────────────────────────────────────────────────────────────

interface UseBiometricReturn {
  isSupported: boolean
  isLoading:   boolean
  register:    (uid: string, tenantId: string) => Promise<boolean>
  verify:      (uid: string, tenantId: string) => Promise<boolean>
}

// ─── PRIVATE: cek apakah WebAuthn tersedia ───────────────────────────────────
function checkWebAuthnSupport(): boolean {
  if (typeof window === 'undefined') return false
  if (!navigator.credentials) return false
  if (!window.PublicKeyCredential) return false
  return true
}

// ─── PRIVATE: baca trusted_device_days dari config ───────────────────────────
async function getTrustedDeviceDays(): Promise<number> {
  try {
    const res  = await fetch('/api/config/security_login')
    const data = await res.json()
    if (data.success && data.data) {
      const allItems: Array<{ policy_key?: string; nilai?: string }> =
        data.data.flatMap(
          (g: { items: Array<{ policy_key?: string; nilai?: string }> }) => g.items
        )
      const item = allItems.find(i => i.policy_key === 'trusted_device_days')
      if (item?.nilai) return Number(item.nilai) || 30
    }
  } catch { /* fallback */ }
  return 30
}

// ─── HOOK: useBiometric ──────────────────────────────────────────────────────

export function useBiometric(): UseBiometricReturn {
  const [isLoading, setIsLoading] = useState(false)
  const isSupported = checkWebAuthnSupport()

  // ── register: buat credential baru + simpan ke trusted_devices ─────────
  async function register(uid: string, tenantId: string): Promise<boolean> {
    if (!isSupported) return false
    setIsLoading(true)

    try {
      const trustedDays = await getTrustedDeviceDays()

      await navigator.credentials.create({
        publicKey: {
          challenge:              crypto.getRandomValues(new Uint8Array(32)),
          rp:                     { name: 'ERP Mediator', id: window.location.hostname },
          user: {
            id:          new TextEncoder().encode(uid),
            name:        uid,
            displayName: uid,
          },
          pubKeyCredParams:       [{ alg: -7, type: 'public-key' }],
          timeout:                60000,
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification:        'required',
          },
        },
      })

      // Simpan ke tabel trusted_devices
      const deviceId = crypto.randomUUID()
      const supabase = createBrowserSupabaseClient()

      await supabase
        .from('trusted_devices')
        .insert({
          id:            deviceId,
          device_id:     deviceId,
          uid,
          tenant_id:     tenantId,
          device_name:   getDeviceInfo(),
          registered_at: new Date().toISOString(),
          last_used_at:  new Date().toISOString(),
        })

      return true
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // ── verify: cek apakah device sudah terdaftar + verifikasi biometric ───
  async function verify(uid: string, tenantId: string): Promise<boolean> {
    if (!isSupported) return false
    setIsLoading(true)

    try {
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('trusted_devices')
        .select('id')
        .eq('uid', uid)
        .eq('tenant_id', tenantId)
        .limit(1)

      if (error || !data || data.length === 0) return false

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge:        crypto.getRandomValues(new Uint8Array(32)),
          timeout:          60000,
          userVerification: 'required',
        },
      })

      return assertion !== null
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return { isSupported, isLoading, register, verify }
}
