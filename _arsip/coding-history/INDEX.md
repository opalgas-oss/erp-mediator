# INDEX — Coding History Archive

**Folder ini menyimpan snapshot file kode SEBELUM perubahan besar/refactor.**

**Tujuan:** Memungkinkan perbandingan "sebelum vs sesudah" refactor, dan rollback manual kalau ternyata refactor menyebabkan regresi.

**Aturan yang melahirkan folder ini:** CODING_RULES_AI — **ATURAN 12: Arsip Coding Sebelum Refactor**

---

| Tanggal | Sesi | Deskripsi |
|---|---|---|
| **17 Mei 2026** | **#173** | **Snapshot `sesi-173-sl-d002-k002-fonnte-server` dibuat (4 file pre-fix): otp + account-lock + tenant-pic + alert service. SL-D002: pola fetch Fonnte duplikat → ekstrak ke lib/utils/fonnte.server.ts → sendFonnteWA().** |
| **17 Mei 2026** | **#170** | **Snapshot `sesi-170-t052-allow-account-sharing` dibuat (2 file pre-fix): `lib/services/membership.service.ts` + `lib/repositories/user-membership.repository.ts` kondisi pre-T-052 partial.** |
| **18 Mei 2026** | **#174** | **Snapshot `sesi-174-sl-d003-k003-validation-server` dibuat (2 file pre-fix): `lib/services/tenant.service.ts` + `lib/services/tenant-pic.service.ts`. SL-D003: validateNomorWa() private duplikat → ekstrak ke lib/utils/validation.server.ts.** |
| **18 Mei 2026** | **#174** | **Snapshot `sesi-174-sl-d007-routes-constant` dibuat (3 file pre-fix): `lib/auth.ts` + `lib/constants/index.ts` + snapshot ROLE_REDIRECT dari middleware.ts. SL-D007: ROLE_DASHBOARD+ROLE_REDIRECT → ekstrak ke lib/constants/routes.constant.ts → ROLE_TO_DASHBOARD.** |
| **18 Mei 2026** | **#175** | **Snapshot `sesi-175-sl-d010-k010-validate-dropdown-slug` dibuat (2 file pre-fix): `lib/services/master-dropdown-group.service.ts` + `lib/services/master-dropdown-option.service.ts`. SL-D010: validateSlug() private duplikat → ekstrak ke lib/utils/validation.server.ts → validateDropdownSlug().** |
| **18 Mei 2026** | **#175** | **Snapshot `sesi-175-sl-d011-validate-sort-order` dibuat (2 file pre-fix, kondisi post-SL-D010): `lib/services/master-dropdown-group.service.ts` + `lib/services/master-dropdown-option.service.ts`. SL-D011: validateSortOrder() private duplikat → ekstrak ke lib/utils/validation.server.ts → validateSortOrder().** |
| **18 Mei 2026** | **#176** | **Snapshot `sesi-176-lr3-cr-constants` dibuat (3 file pre-fix): `lib/auth.ts` + `app/auth/logout-action.ts` + `lib/constants/index.ts`. LR-3: TTL_PRESETS+ROLE_TO_DASHBOARD+SESSION_COOKIE_NAMES belum di cr_constants. Proaktif: SESSION_COOKIES duplikat COOKIES_LOGOUT → ekstrak ke lib/constants/session.constant.ts.** |
| **18 Mei 2026** | **#177** | **Snapshot `sesi-177-pv03-category-repo` dibuat (2 file pre-fix): `lib/repositories/tenant-category-assignment.repository.ts` + `lib/services/category.service.ts`. PV-03: CategoryService_hapus() query DB langsung di service layer — pelanggaran Repository Pattern.** |
| **18 Mei 2026** | **#178** | **Snapshot `sesi-178-t060b-tenant-tier` dibuat (5 file pre-fix): `lib/types/tenant.types.ts` + `lib/services/tenant.service.ts` + tenants/page.tsx + TenantsClient.tsx + DialogTambahTenant.tsx. T-060b: M4 tenant_tipe misaligned ke TenantTier.** |
| **18 Mei 2026** | **#178** | **Snapshot `sesi-178-t059b-gps-mode` dibuat (1 file pre-fix): `lib/hooks/useLoginFlow.ts`. T-059b: gps_mode config_registry konsep salah (select English) → boolean toggle.** |
| **18 Mei 2026** | **#179** | **Snapshot `sesi-179-pv04-tenant-repo-pattern` dibuat (2 file pre-fix): `lib/services/tenant.service.ts` + `lib/repositories/tenant.repository.ts` kondisi pre-PV-04.** |
| **18 Mei 2026** | **#179** | **Snapshot `sesi-179-pv05-pv06-tenant-pic-repo-pattern` dibuat (2 file pre-fix): `lib/services/tenant-pic.service.ts` + `lib/repositories/tenant-pic.repository.ts` kondisi pre-PV-05+PV-06.** |
| **18 Mei 2026** | **#179** | **Snapshot `sesi-179-pv07-pv08-tca-repo-pattern` dibuat (2 file pre-fix): `lib/services/tenant-category-assignment.service.ts` + `lib/repositories/tenant-category-assignment.repository.ts` kondisi pre-PV-07+PV-08.** |
| **18 Mei 2026** | **#177** | **Snapshot `sesi-177-pv09-pv10-config-page-items` dibuat (4 file pre-fix): `lib/config-registry.ts` + 3 RSC page settings. PV-09+PV-10: 3 page query config_registry langsung — pelanggaran Repository Pattern.** |
| **18 Mei 2026** | **#180** | **Snapshot `sesi-180-sl-d009-classify-http-error` dibuat (13 file pre-fix): semua route SA yang pakai keyword-based error classification. SL-D009+K009: classifyHttpError() → lib/utils/http.server.ts.** |
| **18 Mei 2026** | **#180** | **Snapshot `sesi-180-sl-d004-fetch-with-timeout` dibuat (2 file pre-fix): provider-tester.ts + metrics-collector.service.ts. SL-D004: fetchWithTimeout() → lib/utils/fetch.server.ts.** |
| **18 Mei 2026** | **#181** | **Snapshot `sesi-181-sl-d006-get-past-iso-timestamp` dibuat (2 file pre-fix): provider-metrics.repository.ts + alert-log.repository.ts. SL-D006: getPastISOTimestamp() → lib/utils/date.utils.ts.** |
| **18 Mei 2026** | **#181** | **Snapshot `sesi-181-sl-d005-build-id-map` dibuat (2 file pre-fix): complaint.repository.ts + user-membership.repository.ts. SL-D005: buildIdMap() → lib/utils/db.utils.ts.** |
| **19 Mei 2026** | **#182** | **Snapshot `sesi-182-otp-fix-stale-state-remove-optional` dibuat (3 file pre-fix): useLoginFlow.ts + login-types.ts + send-otp/route.ts. FIX-1: selesaiLogin() stale state. FIX-2: hapus mode 'optional' OTP.** |
| **19 Mei 2026** | **#183** | **Snapshot `sesi-183-sa-otp-enforce` dibuat (2 file pre-fix): `app/login/actions.ts` + `lib/hooks/useLoginFlow.ts`. FIX: SA bypass OTP via 2 path — (1) handleLogin unified action langsung router.push, (2) prosesSetelahAuthBerhasil → handleSuperadminLogin tanpa cek config. Fix: tambah `role` ke LoginActionResult; SA/AdminTenant/Customer cek OTP config sebelum redirect; jika required → fetchLoadUserProfile → lanjutSetelahRole. REFACTOR: Vendor path di handleLogin → lanjutSetelahRole (eliminasi duplikasi ATURAN 11). lanjutSetelahRole = single source of truth OTP enforcement semua role.** |
