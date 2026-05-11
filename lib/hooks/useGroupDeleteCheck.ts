// lib/hooks/useGroupDeleteCheck.ts
// ⚠️ DEPRECATED — Sesi #125
// File ini SUDAH TIDAK DIPAKAI setelah Layer 2 refactor di S#125.
// Hook lama (useGroupDeleteCheck → useDeleteWithSafetyCheck dengan deleteVerdicts cache)
// digantikan oleh arsitektur baru:
//   - lib/dropdowns/verdict.ts (pure functions)
//   - lib/hooks/useDeletePermission.ts (memoized verdict)
//   - lib/hooks/useDeleteWithSafetyCheck.ts (rename: useDeleteConfirmDialog)
//
// Code lama tersimpan di:
//   _arsip/coding-history/sesi-125-refactor-verdict-dropdown/lib/hooks/useGroupDeleteCheck.ts
//
// File ini SENGAJA dikosongkan (bukan dihapus) untuk:
//   1. Backward compat: kalau ada caller tersembunyi yang masih import → error eksplisit
//   2. Audit trail di git log: penghapusan logic terjadi di S#125
//
// Hapus file ini di sesi mendatang setelah verified TIDAK ada caller.

export {}
