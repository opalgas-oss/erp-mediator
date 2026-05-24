// app/login/actions.ts — ARSIP SEBELUM EDIT sesi-212-status-redesign
// STATUS-REDESIGN S#212 — baris yang diubah ada di VENDOR sub-path 2:
//
// SEBELUM (sekitar baris 185-188):
//   const { data: profileRow } = await adminDb.from('user_profiles')
//     .select('status, nomor_wa')
//     ...
//   if ((profileRow?.status ?? '').toUpperCase() !== 'APPROVED') {
//
// SESUDAH:
//   const { data: profileRow } = await adminDb.from('user_profiles')
//     .select('register_status, nomor_wa')
//     ...
//   if (profileRow?.register_status !== 'approved') {
//
// File lengkap: lihat git history commit sebelum sesi-212-status-redesign
// Git commit sebelum: 2e01b19 (feat: OTP mode otp_only Fase 3 Step 1-9)
