# INDEX — Coding History Archive

**Folder ini menyimpan snapshot file kode SEBELUM perubahan besar/refactor.**

**Tujuan:** Memungkinkan perbandingan "sebelum vs sesudah" refactor, dan rollback manual kalau ternyata refactor menyebabkan regresi.

**Aturan yang melahirkan folder ini:** CODING_RULES_AI — **ATURAN 12: Arsip Coding Sebelum Refactor**

---

| Tanggal | Sesi | Deskripsi |
|---|---|---|
| **17 Mei 2026** | **#173** | **Snapshot `sesi-173-sl-d002-k002-fonnte-server` dibuat (4 file pre-fix): otp + account-lock + tenant-pic + alert service. SL-D002: pola fetch Fonnte duplikat → ekstrak ke lib/utils/fonnte.server.ts → sendFonnteWA().** |
| **17 Mei 2026** | **#170** | **Snapshot `sesi-170-t052-allow-account-sharing` dibuat (2 file pre-fix): membership.service.ts + user-membership.repository.ts.** |
| **18 Mei 2026** | **#174** | **Snapshot `sesi-174-sl-d003-k003-validation-server` + `sesi-174-sl-d007-routes-constant` dibuat.** |
| **18 Mei 2026** | **#175** | **Snapshot `sesi-175-sl-d010-k010-validate-dropdown-slug` + `sesi-175-sl-d011-validate-sort-order` dibuat.** |
| **18 Mei 2026** | **#176** | **Snapshot `sesi-176-lr3-cr-constants` dibuat. LR-3: TTL_PRESETS+ROLE_TO_DASHBOARD+SESSION_COOKIE_NAMES.** |
| **18 Mei 2026** | **#177** | **Snapshot `sesi-177-pv03-category-repo` + `sesi-177-pv09-pv10-config-page-items` dibuat.** |
| **18 Mei 2026** | **#178** | **Snapshot `sesi-178-t060b-tenant-tier` + `sesi-178-t059b-gps-mode` dibuat.** |
| **18 Mei 2026** | **#179** | **Snapshot `sesi-179-pv04~pv08` dibuat (3 folder).** |
| **18 Mei 2026** | **#180** | **Snapshot `sesi-180-sl-d009-classify-http-error` + `sesi-180-sl-d004-fetch-with-timeout` dibuat.** |
| **18 Mei 2026** | **#181** | **Snapshot `sesi-181-sl-d006` + `sesi-181-sl-d005` dibuat.** |
| **19 Mei 2026** | **#182** | **Snapshot `sesi-182-otp-fix-stale-state-remove-optional` dibuat (3 file): useLoginFlow.ts + login-types.ts + send-otp/route.ts. FIX-1: selesaiLogin stale state. FIX-2: hapus mode 'optional' OTP.** |
| **19 Mei 2026** | **#183** | **Snapshot `sesi-183-sa-otp-enforce` dibuat (5 file): `app/login/actions.ts` + `lib/hooks/useLoginFlow.ts` + `app/api/auth/load-user-profile/route.ts` + `app/api/auth/verify-otp/route.ts`. FIX-3a: SA bypass 2 path + Vendor refactor lanjutSetelahRole. FIX-3b: load-user-profile SA nomor_wa hardcode '' → SELECT nomor_wa + ambil array[0]. FIX-3c: verify-otp tenant_id min(1) menolak SA tenantId='' → hapus min(1) konsisten dengan send-otp.** |
| **19 Mei 2026** | **#184** | **Snapshot `sesi-184-biometric-optional` dibuat (1 file): `app/dashboard/superadmin/settings/security-login/page.tsx`. HUTANG-BIOMETRIC-OPTIONAL: hapus mode 'optional' dari biometric_mode options → ['required', 'disabled']. Konsisten dengan require_otp (FIX-2 S#182).** |
