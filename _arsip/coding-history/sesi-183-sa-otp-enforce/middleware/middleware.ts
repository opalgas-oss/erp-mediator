// ARSIP PRE-FIX S#183 — middleware.ts sebelum tambah otp_pending guard
// Bug: middleware cek Supabase JWT saja, custom cookies tidak relevan untuk auth
// Fix: tambah guard otp_pending di awal Guard 5 — jika cookie ada → redirect /login
