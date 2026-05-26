// ARSIP SEBELUM FIX BUG-026 S#219
// File asli: app/dashboard/superadmin/tenants/TenantTable.tsx
// Masalah: STATUS_STYLE tidak punya key 'in_registration' setelah TenantLifecycleStatus ditambah 'in_registration'
// STATUS_STYLE sebelum fix:
// const STATUS_STYLE: Record<TenantLifecycleStatus, ...> = {
//   active: ..., pending: ..., suspended: ..., expired: ..., terminated: ...
//   — 'in_registration' TIDAK ADA
// }
