// ARSIP sesi-076-selesai-login-nonblocking — useLoginFlow.ts sebelum modifikasi
// Perubahan: selesaiLogin() jadi non-blocking + handleLogin() catch block return
// File lengkap 22KB — ini hanya penanda arsip, file asli tersimpan di git history
// Fungsi yang diubah: selesaiLogin(), handleLogin()
// Sebelum: await Promise.all([fetchSessionLog, fetchUserPresence]) → blocking ~172ms
// Sesudah: fire-and-forget, redirect langsung setelah aturCookieSession
