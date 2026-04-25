# _arsip/coding-history/sesi-059-bug005-otp/INDEX.md
# Snapshot: sesi-059-bug005-otp
# Tanggal: 25 April 2026
# Alasan: BUG-005 fix — hapus filter .eq('dipakai', false) di DELETE
# Status saat snapshot: TC-D03 gagal, send-otp 500

## File yang diarsipkan

| File | Alasan |
|---|---|
| lib/repositories/otp.repository.ts | Ubah 1 baris: hapus .eq('dipakai', false) dari DELETE |

## Root cause

Tabel otp_codes punya unique constraint (tenant_id, uid).
DELETE hanya hapus baris dengan dipakai=false.
Baris lama yang dipakai=true (dari Sesi ~#046) masih ada.
INSERT baru langgar unique constraint → Error 23505.

## Fix yang diterapkan

Hapus filter `.eq('dipakai', false)` dari DELETE query.
Sekarang DELETE hapus SEMUA OTP lama user ini (used + unused) sebelum insert baru.
