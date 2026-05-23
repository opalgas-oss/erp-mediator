// ARSIP SESI #205 — PRE-FIX BUG-017
// File asli: lib/hooks/useLoginFlow.ts
// Disalin sebelum modifikasi: kirimOTP() setOtpPercobaan(0) + handleVerifikasiOTP()
// Versi penuh ada di sesi read — arsip ini mencatat versi sebelum fix BUG-017
// Baris kritis yang diubah:
//   kirimOTP(): setOtpInput(''); setOtpPercobaan(0); setTahap('OTP')   <-- setOtpPercobaan(0) DIHAPUS
//   handleVerifikasiOTP(): tidak ada handling 'MAX_ATTEMPTS'           <-- DITAMBAH
// Untuk baca full content arsip: lihat KERJA_SESI_205.md
