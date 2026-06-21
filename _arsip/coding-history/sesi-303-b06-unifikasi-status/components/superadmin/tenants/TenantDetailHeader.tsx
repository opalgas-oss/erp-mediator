'use client'

// ARSIP S#303 — sebelum unifikasi status ke active/non_active
// File asli: components/superadmin/tenants/TenantDetailHeader.tsx
// Status lama: active, suspended, terminated, pending, in_registration, expired

import type { Tenant, TenantLifecycleStatus, TenantTipe, TenantTier, TenantStatusPKP } from '@/lib/types/tenant.types'

const STATUS_STYLE: Record<TenantLifecycleStatus, { bg: string; text: string; border: string; icon: string; label: string }> = {
  in_registration: { bg: '#EEF2FF', text: '#3730A3', border: '#A5B4FC', icon: 'ti-file-description', label: 'Dalam Registrasi' },
  pending:    { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-hourglass',       label: 'Menunggu' },
  active:     { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459', icon: 'ti-circle-check',    label: 'Aktif' },
  suspended:  { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27', icon: 'ti-player-pause',    label: 'Dinonaktifkan' },
  expired:    { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9', icon: 'ti-hourglass-empty', label: 'Kedaluwarsa' },
  terminated: { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595', icon: 'ti-circle-x',        label: 'Diakhiri' },
}
// Konten lengkap tersimpan di git history — commit sebelum S#303-unifikasi-status
