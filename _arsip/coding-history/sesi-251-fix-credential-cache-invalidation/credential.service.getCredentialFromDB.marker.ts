// ARSIP SESI #251 — sebelum fix getCredentialFromDB envelope encryption mismatch
// Original: lib/services/credential.service.ts (fungsi getCredentialFromDB saja)
// BUG: getCredentialFromDB pakai spGetCredential (return encrypted_value only) + dekripsi() (simple)
// Credential baru disimpan dengan enkripsiCredential() (envelope DEK) — MISMATCH → return null
// Fix S#251: ganti ke query direct instance_credentials dengan encrypted_dek → dekripsiCredential()
