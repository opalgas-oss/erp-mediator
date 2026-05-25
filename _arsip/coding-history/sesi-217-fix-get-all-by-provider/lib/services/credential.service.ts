// ARSIP S#217 — PRE-FIX getCredentialsByProvider
// Original: lib/services/credential.service.ts
// Masalah: getCredentialsByProvider pakai dekripsi() (simple) untuk semua field
//          padahal simpanCredential pakai enkripsiCredential() (envelope) — MISMATCH
// Baris kritis yang difix (dalam getCredentialsByProvider cached function):
//   map[c.field_key] = c.is_secret ? dekripsi(c.encrypted_value) : c.encrypted_value
// Fix: gunakan dekripsiCredential(c.encrypted_dek, c.encrypted_value) jika DEK ada
