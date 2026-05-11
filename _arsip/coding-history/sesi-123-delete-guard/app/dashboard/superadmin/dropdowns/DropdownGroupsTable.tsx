// ARSIP: app/dashboard/superadmin/dropdowns/DropdownGroupsTable.tsx
// Sebelum fix: isDelBlocked hanya cek TIDAK_AMAN/TIDAK_BISA, tidak cek undefined/loading
// Bug: tombol merah saat page buka, baru grey setelah prefetch selesai
// Diperbaiki S#123 — sesi-123-delete-guard
