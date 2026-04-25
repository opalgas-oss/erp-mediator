# SNAPSHOT — Sesi #062 — hapus biometric dari login flow
# Diarsipkan: Sesi #062 — 25 April 2026
# Alasan: Keputusan Philips Sesi #061 — Biometric DIHAPUS dari login flow.
#   Biometric hanya ada di: Register (ditawarkan jika device support) + Dashboard Settings.
#   Login post-OTP langsung selesaiLogin() — tidak ada stage BIOMETRIC.
#
# File yang akan diubah:
#   - app/login/page.tsx         → hapus import BiometricStage + hapus render tahap BIOMETRIC
#   - lib/hooks/useLoginFlow.ts  → ganti setTahap('BIOMETRIC') → selesaiLogin(),
#                                   hapus handleAktifkanBiometric, hapus handleLewatiBiometric,
#                                   hapus useBiometric jika tidak dipakai lagi,
#                                   hapus dari LoginFlowState interface

# ─── SNAPSHOT: app/login/page.tsx ────────────────────────────────────────────
# (isi file asli sebelum modifikasi — disimpan di bawah ini sebagai referensi)
