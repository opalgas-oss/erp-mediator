// ARSIP PRE-FIX — middleware.ts
// Sesi: SESI-16 (CASE_DASHBOARD_SA_DAN_AKSES_AT)
// Tanggal: 8 Juni 2026
// Alasan arsip: Guard 5 hanya cover /dashboard — route /api/superadmin/* tidak
//               mendapat header x-is-super-admin → requireSuperAdmin() return 401
// Fix yang dilakukan: tambah Guard 6 untuk /api/superadmin/* — inject header sama
//                     dengan Guard 5 tapi tanpa role check / redirect
// ============================================================
// ISI FILE ASLI SEBELUM FIX:
// Guard 2: if (pathname.startsWith('/api/auth/')) → NextResponse.next() LANGSUNG
// Tidak ada guard untuk /api/superadmin/*
// Akibat: x-is-super-admin tidak pernah di-set untuk API route SA
// ============================================================
