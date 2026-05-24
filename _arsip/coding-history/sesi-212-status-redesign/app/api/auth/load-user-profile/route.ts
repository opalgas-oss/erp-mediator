// app/api/auth/load-user-profile/route.ts — ARSIP SEBELUM EDIT sesi-212-status-redesign
// STATUS-REDESIGN S#212: user_profiles.status -> register_status
// Baris yang diubah:
//   .select('nama, role, nomor_wa, status') -> .select('nama, role, nomor_wa, register_status')
//   status: profile.status || '' -> register_status: profile.register_status || ''
// File asli ada di git history commit 2e01b19
