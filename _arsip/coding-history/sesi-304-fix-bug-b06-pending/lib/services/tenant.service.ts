// ARSIP — sesi-304-fix-bug-b06-pending
// Snapshot SEBELUM fix BUG-B06-PENDING (tambah validTransitions non_active→pending, pending→active)
// Tanggal arsip: 21 Juni 2026

// lib/services/tenant.service.ts — fungsi TenantService_updateLifecycleStatus (bagian yang diubah)
// validTransitions SEBELUM fix:
//
//   const validTransitions: Record<TenantLifecycleStatus, TenantLifecycleStatus[]> = {
//     active:     ['non_active'],
//     non_active: ['active', 'non_active'],
//   }
//
// TenantLifecycleStatus SEBELUM fix: 'active' | 'non_active'
