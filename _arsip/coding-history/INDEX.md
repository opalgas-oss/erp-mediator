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
| **19 Mei 2026** | **#184** | **Snapshot `sesi-184-sa-config-separation` dibuat (4 file): `app/login/login-types.ts` + `app/login/actions.ts` + `app/api/auth/send-otp/route.ts` + `lib/hooks/useLoginFlow.ts` (note). HUTANG-SA-CONFIG-SEPARATION: pisah config key require_otp+biometric_mode dari SA. Tambah getRequireOtpConfigKey(). 5 titik kode diupdate + 4 operasi DB + page.tsx entry baru.** |
| **19 Mei 2026** | **#184** | **Snapshot `sesi-184-fix-per-role-allowed-roles` dibuat (2 file): `components/PerRoleJsonEditor.tsx` + `lib/utils/config-page.utils.ts`. BUG FIX: PerRoleJsonEditor hardcode 4 role tanpa allowedRoles filter → blank dropdowns + risiko data corruption. Fix: tambah allowedRoles prop ke JsonFieldConfig+ConfigItemData+PerRoleJsonEditor.** |
| **19 Mei 2026** | **#185** | **Snapshot `sesi-185-fix-sa-otp-disabled` dibuat (1 file): `lib/hooks/useLoginFlow.ts`. BUG FIX: regresi S#184 — SA OTP=disabled masih masuk OTP flow di client. Root cause: configLogin tidak punya key 'require_otp_superadmin' (RLS filter + default state tidak diupdate saat S#184). Fix: handleLogin percaya result.redirectTo dari server (bukan re-check configLogin) sebagai indikator OTP=disabled.** |
| **19 Mei 2026** | **#185** | **Snapshot `sesi-185-otp-enforcement-vendor-at-customer` dibuat (1 file): `app/login/actions.ts`. FIX OTP enforcement Vendor/AdminTenant/Customer: setCookiesLoginServer dipanggil sebelum OTP diverifikasi. Bug tambahan Vendor sub-path 2: setCookies dalam Promise.all sebelum cek vendor status.** |
| **19 Mei 2026** | **#187** | **Snapshot `sesi-187-fix-cold-start-login` dibuat (1 file): `app/api/keep-warm/route.ts`. FIX BUG-021 Layer 1: keep-warm fan-out GET-only tidak warm POST Server Action bundle `loginUnifiedAction` → cold start 31.77s. Strategi fix: (1) tambah file BARU `app/api/auth/warmup-login-action/route.ts` yang import semua modul login (tanpa side-effect) agar Server Action bundle ter-inisialisasi via cron, (2) tambah URL endpoint baru ke array `targets` di keep-warm/route.ts. Klasifikasi dampak: RENDAH (0 internal caller di kode, hanya 2 cron eksternal cron-job.org + GitHub Actions yang tidak terdampak karena signature GET + auth + response shape tetap).** |
