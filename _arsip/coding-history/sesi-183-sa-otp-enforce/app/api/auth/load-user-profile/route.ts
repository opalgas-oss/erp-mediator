// ARSIP PRE-FIX S#183 — load-user-profile SA nomor_wa hardcode ''
// Original: app/api/auth/load-user-profile/route.ts
// Bug: SA path SELECT 'nama' saja, return nomor_wa: '' hardcode
// Fix: tambah 'nomor_wa' ke SELECT, ambil elemen pertama array
