# CATATAN ARSIP — sesi-216-fix-kelola-prefill
# Perubahan: UX "Kelola" pre-fill form dari DB + GET credentials plaintext endpoint
# Kondisi file sebelum perubahan:
# - credential.repository.ts: versi setelah fix getCredentialsByInstanceId (sesi-216-fix-credential-decode)
# - credential.service.ts: versi setelah fix bypass cache dan dekripsiCredential di testKoneksi
# - credentials/route.ts: hanya POST handler
# - DialogKonfigurasiKoneksi.tsx: selalu buat instance baru, tidak pre-fill
