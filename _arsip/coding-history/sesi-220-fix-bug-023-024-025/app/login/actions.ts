// ARSIP PRE-FIX — SESI #220
// File: app/login/actions.ts
// Snapshot sebelum fix BUG-023 (security login bypass) + BUG-024 (verifyOtpOnlyAction)
// Git commit sebelum edit: 42b8066
// Baris yang akan diubah:
//   BUG-023 Vendor  outer: "if (vRegStatus !== 'approved' || vLcStatus === 'pending')"
//   BUG-023 Vendor  inner: "if (vRegStatus === 'approved' && vLcStatus === 'pending')"
//   BUG-023 AT      outer: "if (atRegStatus !== 'approved' || atLcStatus === 'pending')"
//   BUG-023 AT      inner: "if (atRegStatus === 'approved' && atLcStatus === 'pending')"
//   BUG-024 ADD: verifyOtpOnlyAction (fungsi baru di akhir file)
//   BUG-024 import: tambah verifyAndConsume ke import otp.service
// ─────────────────────────────────────────────────────────────────────────────
// [KONTEN PENUH FILE — snapshot dari git 42b8066, identik dengan file aktual sebelum fix S#220]
// Lihat git history untuk diff lengkap: git show 42b8066:app/login/actions.ts
