// ARSIP — sesi-304-fix-bug-b06-pending
// Snapshot SEBELUM fix BUG-B06-PENDING (tambah 'pending' ke TenantLifecycleStatus)
// Tanggal arsip: 21 Juni 2026

// lib/types/tenant.types.ts
// Tipe data untuk M6 Tenant Management — entitas Tenant
// Dipakai oleh: tenant.repository.ts, tenant.service.ts, API routes M6, UI halaman Tenant
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.2
// Update: Sesi #212 — STATUS-REDESIGN: tambah TenantRegisterStatus, Tenant.status→lifecycle_status+register_status

// ─── Literal Types ────────────────────────────────────────────────────────────

// S#303 UNIFIKASI STATUS: hanya 2 nilai — active dan non_active
export type TenantLifecycleStatus = 'active' | 'non_active'

// STATUS-REDESIGN S#212 — status registrasi/onboarding tenant
export type TenantRegisterStatus =
  | 'pending'
  | 'review'
  | 'approved'
  | 'rejected'

export type TenantTipe = 'internal' | 'eksternal'

export type TenantTier = 'starter' | 'growth' | 'enterprise'

export type TenantStatusPKP = 'pkp' | 'non_pkp'

export type TenantBentukBadan =
  | 'pt'
  | 'cv'
  | 'perorangan_umkm'
  | 'yayasan'
  | 'koperasi'

export type TenantContractStatus =
  | 'draft'
  | 'aktif'
  | 'kedaluwarsa'
  | 'dihentikan_awal'
  | 'diperbarui'
