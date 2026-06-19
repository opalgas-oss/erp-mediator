# INDEX — Coding History Archive

**Folder ini menyimpan snapshot file kode SEBELUM perubahan besar/refactor.**

**Tujuan:** Memungkinkan perbandingan "sebelum vs sesudah" refactor, dan rollback manual kalau ternyata refactor menyebabkan regresi.

**Aturan yang melahirkan folder ini:** CODING_RULES_AI — **ATURAN 12: Arsip Coding Sebelum Refactor**

---

| Tanggal | Sesi | Deskripsi |
|---|---|---|
| **18 Juni 2026** | **#293** | **Snapshot `sesi-293-fonnte-ping-fix` dibuat (1 file): `lib/services/metrics-collector.service.ts` (snapshot pra-fix). FIX Fonnte false-DOWN di L1 monitoring: `pingProvider()` generik melakukan GET tanpa auth ke `status_url`, tapi Fonnte tidak punya status-page publik dan `status_url`-nya di-set ke `/check` (404). Fonnte hanya bisa dicek via POST `/device` + api_token. Fix: tambah helper `pingFonnte()` (POST /device, Authorization=api_token dari M3, baca `device_status`: connect→UP, disconnect→DOWN, status:false/HTTP error→DOWN) + dispatch `kode==='fonnte'` di `pingProvider`. Supabase: `service_providers.status_url` Fonnte di-NULL-kan (tidak relevan untuk authenticated ping). Anti-hardcode: token dari M3 (api_token fp 3nVo). CATATAN: file 14.1KB sudah >10KB sebelum fix — pemecahan per-provider dicatat sebagai HUTANG-SPLIT-COLLECTOR (tidak dikerjakan di sesi ini). Root cause sama pola dengan grafik S#292: bug di kode kita, bukan provider.** |
| **10 Juni 2026** | **#258** | **Snapshot `sesi-258-monitoring-repo-pattern` dibuat (1 file): `app/dashboard/superadmin/monitoring/page.tsx` (snapshot pra-fix). FIX T-S258-02 (Repository Pattern): hapus direct `db.from('config_registry')` di RSC monitoring page — pelanggaran layer identik PV-09/PV-10 yang sudah difix S#177 di 3 settings pages tapi monitoring TERLEWAT. Ganti dengan `getConfigPageItems('monitoring')` dari lib/config-registry (fungsi sudah ada, ber-cache unstable_cache TTL 300s tag 'config', tidak filter is_active sesuai pola S#110). Hapus import createServerSupabaseClient + hapus casting `as` (configRows kini bertipe ConfigRegistryFullItem[]). Temuan dari BLOK 0.1 audit statis HUTANG-VERIFIKASI-MENU-SA.** |
| **10 Juni 2026** | **CASE SESI-26** | **Snapshot `case-sesi26-fix-redirect-at` dibuat (2 file). (1) FIX redirect AT login: `hitungTujuanRedirectServer()` di `login-action-helpers.ts` — `[ROLES.ADMIN_TENANT]: '/dashboard/admin'` → `'/dashboard/admintenant'`. (2) FIX logout redirect per role: `logout-action.ts` — `redirect('/login')` diganti `redirect(tujuanLogout(role))`, dengan mapping SA→/sa/masuk, AT→/kelola/masuk, Vendor/Customer→/login. Root cause: logout selalu ke `/login` tanpa peduli role. Sesuai BLUEPRINT_LOGIN_4_PINTU.** |
| **8 Juni 2026** | **CASE SESI-16** | **Snapshot `sesi-16-fix-middleware-api-header` dibuat (1 file — note pre-fix): `middleware_pra-fix-api-guard.ts`. FIX KRITIS BUG-034 sisi middleware: Guard 5 hanya cover `/dashboard/*` — route `/api/superadmin/*` tidak pernah mendapat header `x-is-super-admin`. Akibat: `requireSuperAdmin()` di semua API route SA selalu return 401. Fix: tambah Guard 6 untuk `/api/superadmin/*` + `/api/admintenant/*` — inject auth headers (x-user-id, x-user-role, x-is-super-admin, dll) sama dengan Guard 5. Sekaligus refactor: ekstrak helper `decodeJwtFromSession()` reusable untuk Guard 1B + Guard 6 (DRY). Root cause ditemukan setelah: decode JWT cookie Philips → `is_super_admin: true` sudah ada di token; Edge Function v9 RPC `get_super_admin_data()` SECURITY DEFINER jalan benar; trace alur middleware → API route → header kosong. Akar masalah tab AdminTenant kosong sejak model AUTH diubah ke NORMALIZED di SESI-12.** |
| **8 Juni 2026** | **CASE SESI-15** | **Snapshot `sesi-15-ui-standar` dibuat (3 file full + 2 stub). UPDATE STANDAR UI/UX BATCH 1: `RolesClient.tsx` (full) + `PermissionsClient_stub.txt` + `MessageLibraryClient_stub.txt`. Perubahan: th `text-[12px]`, td `text-[13px]`, input `h-9 py-2 px-3 text-[13px]`, Select `h-9 text-[13px]`, `td py-3 px-3.5`. HANYA perubahan visual — tidak ada perubahan logika bisnis. Sesuai STANDAR_UI_UX/ S1+S4.** |
| **8 Juni 2026** | **CASE SESI-12** | **Folder `case-sesi12-auth-normalized` dibuat. AUTH Normalized refactor menyeluruh (keputusan Philips 8 Juni 2026 — ATURAN 44). Arsip: `roles.constant_pra-lowercase_2026-06-08.ts` (ROLES uppercase→lowercase) + `auth-server_pra-normalized.note` (deskripsi perubahan). Edge Function v7 diarsip ke `Shared_Database/ARSIP/EdgeFunction_inject-custom-claims_v7_pra-v8_2026-06-08.ts`. Perubahan: (1) Edge Function v8 deploy — hapus flat app_role/tenant_id, fix BUG-034 (kolom status→register_status), pertahankan is_super_admin+memberships; (2) users.role UPDATE 'SUPERADMIN'→'super_admin' (1 baris); (3) ROLES.*: uppercase→lowercase (roles.constant.ts); (4) VENDOR_STATUS.*: uppercase→lowercase + acuan kolom status→register_status; (5) middleware.ts: hapus extractRoleFromAppMeta, prioritas normalized; (6) auth-server.ts: requireSuperAdmin cek isSuperAdmin flag; (7) routes.constant.ts: hapus legacy key 'SUPER_ADMIN'. Hutang HUTANG-CASING-ROLE-LOWERCASE ditutup (Supabase + konstanta). Sisa sweep: Functions_EdgeFunctions.md + ARSITEKTUR_SERVICES Bab 2 + dashboard SA layout + commit.** |
| **8 Juni 2026** | **CASE SESI-13** | **Snapshot `case-sesi13-fix-decode-claims` dibuat (4 file — note pre-fix): `login-action-helpers.ts` + `useLoginFlow.ts` + `load-user-profile/route.ts` + `create-superadmin/route.ts`. FIX T-1: decodeAppClaims() baca app_role flat → is_super_admin+memberships[] JWT v8. FIX T-2: prosesSetelahAuthBerhasil() baca app_role/tenant_id flat → is_super_admin+memberships[]. T-4 otomatis via T-1. FIX T-X1: load-user-profile return role:'SUPERADMIN' uppercase → ROLES.SUPERADMIN='super_admin'. FIX T-X2: create-superadmin query+insert role 'SUPERADMIN' → 'super_admin'. FIX T-X3: create-superadmin app_metadata app_role flat dihapus (model normalized v8). Ref: KEPUTUSAN_AUTH_NORMALIZED_v1.md ATURAN 41+44.** |
| **8 Juni 2026** | **CASE SESI-11** | **Snapshot `sesi-133-m6-bugfix-colgroup` dibuat (2 file): `app/dashboard/superadmin/tenants/TenantTable.tsx` + `app/dashboard/superadmin/categories/CategoriesClient.tsx`. FIX colgroup hydration error.** |
| **8 Juni 2026** | **CASE SESI-11** | **Snapshot `case-sesi11-TEN1-TEN2-fix` dibuat (5 file — pre-fix TEN-1/TEN-2).** |
| **4 Juni 2026** | **#256** | **Snapshot `sesi-256-fase2-userakses-at` dibuat (3 file).** |
| **4 Juni 2026** | **#254** | **Snapshot `sesi-254-nav-datadriven` dibuat (3 file).** |
| **3 Juni 2026** | **#252b** | **Snapshot `sesi-252b-pakai-existing-confirm` dibuat (3 file).** |
| **3 Juni 2026** | **#252** | **Snapshot `sesi-252-aktivasi-page` dibuat (1 file).** |
| **3 Juni 2026** | **#251** | **Snapshot `sesi-251-fix-credential-cache-invalidation` dibuat (1 file).** |
| **3 Juni 2026** | **#249** | **Snapshot `sesi-249-step2-provider-inactive` + `sesi-249-bug033-placeholder-fix` dibuat.** |
| **3 Juni 2026** | **#248** | **Snapshot `sesi-248-rollback-per-field` dibuat (6 file).** |
| **3 Juni 2026** | **#247** | **Snapshot `sesi-247-fix-judul-double-providers` dibuat (1 file).** |
| **2 Juni 2026** | **#243** | **Snapshot `sesi-243-kirim-ulang-aktivasi` dibuat (2 file).** |
| **2 Juni 2026** | **#240** | **Snapshot `sesi-240-hutang-at-auth-step-b` + `sesi-240-hutang-at-auth-step-c` dibuat.** |
| **1 Juni 2026** | **#238** | **Snapshot `sesi-238-hutang-at-auth` dibuat (6 file).** |
| **1 Juni 2026** | **#230** | **Snapshot `sesi-230-rename-tenant-admintenant-history` dibuat (1 file).** |
| **30 Mei 2026** | **#221** | **Snapshot `sesi-221-step2-otp-mode-both` dibuat (5 file).** |
| **26 Mei 2026** | **#220** | **Snapshot `sesi-220-fix-bug-023-024-025` dibuat (3 file).** |
| **26 Mei 2026** | **#219** | **Snapshot `sesi-219-fix-bug-026` dibuat.** |
| **25 Mei 2026** | **#218** | **Snapshot `sesi-218-tambah-provider` dibuat (2 file).** |
| **25 Mei 2026** | **#217** | **Snapshot `sesi-217-fix-get-all-by-provider` dibuat (2 file).** |
| **25 Mei 2026** | **#216** | **Snapshot `sesi-216-fix-otp-lifecycle` + `sesi-216-fix-credential-decode` + `sesi-216-fix-kelola-prefill` dibuat.** |
| **25 Mei 2026** | **#215** | **Snapshot `sesi-215-otp-trigger` + `sesi-215-kirim-ulang-aktivasi` dibuat.** |
| **24 Mei 2026** | **#213** | **Snapshot `sesi-213-status-popup` dibuat.** |
| **24 Mei 2026** | **#212** | **Snapshot `sesi-212-status-redesign` dibuat (11 file).** |
| **24 Mei 2026** | **#208** | **Snapshot `sesi-208-audit-hardcode-otpstage` dibuat (5 file).** |
| **24 Mei 2026** | **#207** | **Snapshot `sesi-207-fix-resend-ttl` dibuat.** |
| **23 Mei 2026** | **#206** | **Snapshot `sesi-206-*` dibuat (4 snapshot).** |
| **23 Mei 2026** | **#205** | **Snapshot `sesi-205-fix-bug-017-018-019` dibuat (4 file).** |
| **21 Mei 2026** | **#201** | **Snapshot `sesi-201-revert-magic-link` dibuat (2 file).** |
| **21 Mei 2026** | **#200** | **Snapshot `sesi-200-magic-link` dibuat (2 file).** |
| **21 Mei 2026** | **#197** | **Snapshot `sesi-197-rek-c-preconnect` dibuat (1 file).** |
| **21 Mei 2026** | **#196** | **Snapshot `sesi-196-rek-a-parallel-getgeo` dibuat (1 file).** |
| **20 Mei 2026** | **#194** | **Snapshot `sesi-194-fix-gps-login-blocking` dibuat (5 file).** |
| **20 Mei 2026** | **#192** | **Snapshot `sesi-192-revert-step-6` dibuat (1 file).** |
| **20 Mei 2026** | **#191** | **Snapshot `sesi-191-*` dibuat (2 snapshot).** |
| **20 Mei 2026** | **#190** | **Snapshot `sesi-190-*` dibuat (2 snapshot).** |
| **19 Mei 2026** | **#187** | **Snapshot `sesi-187-fix-cold-start-login` dibuat (1 file).** |
| **19 Mei 2026** | **#185** | **Snapshot `sesi-185-*` dibuat (2 snapshot).** |
| **19 Mei 2026** | **#184** | **Snapshot `sesi-184-*` dibuat (4 snapshot).** |
| **19 Mei 2026** | **#183** | **Snapshot `sesi-183-sa-otp-enforce` dibuat (5 file).** |
| **19 Mei 2026** | **#182** | **Snapshot `sesi-182-otp-fix-stale-state-remove-optional` dibuat.** |
| **18 Mei 2026** | **#181** | **Snapshot `sesi-181-*` dibuat.** |
| **18 Mei 2026** | **#180** | **Snapshot `sesi-180-*` dibuat.** |
| **18 Mei 2026** | **#179** | **Snapshot `sesi-179-*` dibuat.** |
| **18 Mei 2026** | **#178** | **Snapshot `sesi-178-*` dibuat.** |
| **18 Mei 2026** | **#177** | **Snapshot `sesi-177-*` dibuat.** |
| **18 Mei 2026** | **#176** | **Snapshot `sesi-176-lr3-cr-constants` dibuat.** |
| **18 Mei 2026** | **#175** | **Snapshot `sesi-175-*` dibuat.** |
| **18 Mei 2026** | **#174** | **Snapshot `sesi-174-*` dibuat.** |
| **17 Mei 2026** | **#173** | **Snapshot `sesi-173-sl-d002-k002-fonnte-server` dibuat.** |
| **17 Mei 2026** | **#172** | **Snapshot `sesi-172-sl-d001-k001-brand-server` dibuat.** |
| **17 Mei 2026** | **#171** | **Snapshot `sesi-171-t055-monitoring-config-keys` dibuat.** |
| **17 Mei 2026** | **#170** | **Snapshot `sesi-170-*` dibuat (2 snapshot).** |
| **17 Mei 2026** | **#169** | **Snapshot `sesi-169-t049-multi-role-policy` dibuat.** |
| **17 Mei 2026** | **#168** | **Snapshot `sesi-168-t040-require-otp-per-role` dibuat.** |
| **17 Mei 2026** | **#167** | **Snapshot `sesi-167-t039-otp-channel-routing` dibuat.** |
| **17 Mei 2026** | **#166** | **Snapshot `sesi-166-*` dibuat (2 snapshot).** |
| **17 Mei 2026** | **#165** | **Snapshot `sesi-165-*` dibuat (2 snapshot).** |
| **17 Mei 2026** | **#164** | **Snapshot `sesi-164-*` dibuat (2 snapshot).** |
| **16 Mei 2026** | **#163** | **Snapshot `sesi-163-*` dibuat (2 snapshot).** |
| **16 Mei 2026** | **#162** | **Snapshot `sesi-162-*` dibuat (2 snapshot).** |
| **16 Mei 2026** | **#161** | **Snapshot `sesi-161-*` dibuat (3 snapshot).** |
| **16 Mei 2026** | **#160** | **Snapshot `sesi-160-t005-monitoring-policy-key` dibuat.** |
| **12 Mei 2026** | **#133–#137** | **Snapshot berbagai sesi M6 dibuat. Beberapa dengan catatan ATURAN 12 violation (lihat entri panjang di versi INDEX sebelumnya).** |
| **10 Juni 2026** | **CASE SESI-25** | **Snapshot `case-sesi25-login-4-pintu` dibuat (1 file arsip). BLUEPRINT_LOGIN_4_PINTU_v1 Langkah 2d+2e+2f: (1) `app/sa/masuk/page.tsx` BARU — pintu login SuperAdmin (clone verbatim dari app/login/page.tsx, import path diubah ke absolute); (2) `app/kelola/masuk/page.tsx` BARU — pintu login AdminTenant (clone verbatim); (3) `app/login/page.tsx` diupdate — sekarang khusus Customer+Vendor dengan komentar identitas pintu; (4) `middleware.ts` — tambah `/sa/masuk` + `/kelola/masuk` ke PUBLIC_PATHS + Guard 1B masing-masing (redirect ke dashboard bila sudah authenticated, hormati otp_pending). Arsip: `case-sesi25-login-4-pintu/app/login/page.tsx` (snapshot page.tsx sebelum pemisahan). HUTANG tersisa: fix redirect `/dashboard/admin` → `/dashboard/admintenant` di login-action-helpers.ts (dikerjakan bersama Dashboard AT).** |
| **16 Juni 2026** | **S#285** | **Snapshot `sesi-285-hide-at-toggle-multi-role-platform-general` dibuat. Hide AT toggle untuk multi-role-policy (15 item SA-only) dan platform-general (5 item SA-only). Fix Supabase: sidebar_cache_ttl_seconds tenant_can_override dikoreksi false. Tambah hideTenantOverrideToggle: true di kedua page.tsx. Arsip: 2 file.** |
| **16 Juni 2026** | **S#285** | **Snapshot `sesi-285-fix-gps-mode-toggle` dibuat. Fix anomali gps_mode: tipe_data='toggle' di DB tidak punya case di mapTipe → fallthrough ke 'number-unit' → nilai 'true' jadi NaN → tampil 0. Fix: tambah case 'toggle' di mapTipe + mapValue di config-page.utils.ts. Arsip: 1 file.** |
| **16 Juni 2026** | **S#285** | **Snapshot `sesi-285-hide-at-toggle-security-login` dibuat. B-03 mapping AT toggle: tambah `HIDE_AT_TOGGLE` set di `page.tsx` security-login untuk 8 policy_key yang toggle "Tenant Admin boleh ubah"-nya WAJIB disembunyikan dari UI (item keamanan platform: notify_superadmin_on_lock, progressive_lockout_enabled, vendor_blocked_statuses, gps_mode, otp_expiry_seconds, max_otp_attempts, otp_digits, max_otp_resend). Arsip: 1 file.** |
| **17 Juni 2026** | **S#289** | **Snapshot `sesi-289-fix-usecase-race-condition` dibuat. Fix race condition use_cases di DialogKonfigurasiKoneksi: loadData() async overwrite pilihan user karena defaultInst.use_cases kosong di DB. Fix: tambah `loadingData` state — tombol use_case disabled (opacity 0.5, cursor wait) sampai loadData selesai, lalu setUseCases dari DB. Arsip: 1 file (DialogKonfigurasiKoneksi.tsx snapshot sebelum fix).** |
| **17 Juni 2026** | **S#289** | **Fix stale closure `useCases` di `save()` useCallback — useCases tidak ada di dependency array sehingga save() selalu baca useCases=[] meskipun user sudah klik. Fix: tambah useCases + fds ke dependency array. Tidak ada arsip terpisah (1-baris fix, arsip utama sudah ada di sesi-289-fix-usecase-race-condition).** |
| **17 Juni 2026** | **S#289** | **Fix testFonnte() di provider-tester.ts: endpoint /device butuh device token, tapi M3 menyimpan account token (yang benar untuk sendFonnteWA). Ganti endpoint /device → /get-devices (POST, butuh account token). OTP berjalan benar karena pakai account token via credential.service — endpoint test yang salah, bukan tokennya. Tidak ada arsip terpisah (inline fix).** |
| **17 Juni 2026** | **S#292** | **Snapshot `sesi-292-qstash-setup` dibuat. HUTANG-QSTASH: QStash EU credentials ditambah ke Vercel env. Route collect-metrics diupdate dual-mode (CRON_MODE=qstash/vercel). 2 schedule dibuat di QStash dashboard: L1 tiap menit, L3 tiap 15 menit. Cron terbukti jalan: 6 tick berturut UP di provider_metrics. Arsip: lihat folder sesi-292-qstash-setup.** |
| **18 Juni 2026** | **S#293** | **Snapshot `sesi-293-fonnte-ping-fix` dibuat. Fix Fonnte false-DOWN: pingFonnte() POST /device + api_token M3, baca device_status. Sebelumnya GET ke status_url ‘/check’ → 404. status_url Fonnte = NULL (JANGAN diisi ulang). 6 tick cron berturut UP. Arsip: 1 file (metrics-collector.service.ts).** |
| **19 Juni 2026** | **S#295** | **Snapshot `sesi-295-split-metrics-collector` dibuat (1 file). HUTANG-SPLIT-COLLECTOR: pecah `metrics-collector.service.ts` (17.1KB) menjadi orchestrator + 5 file collector terpisah. Orchestrator tetap di `lib/services/metrics-collector.service.ts` — export publik `collectL1Metrics` + `collectL3Metrics` tidak berubah, caller `route.ts` tidak perlu diubah. Collector dipindah ke `lib/services/collectors/`: supabase.collector.ts (L3 Supabase Management API — implementasi nyata health endpoint, butuh credential baru: project_ref di M3), vercel.collector.ts (L3 Vercel REST API — deployments + success rate 5 deploy terakhir + build duration), upstash.collector.ts (L3 Upstash Redis INFO — dipindah tanpa perubahan logic), cloudinary.collector.ts (L3 Cloudinary Admin API /usage — implementasi nyata Basic Auth base64), github.collector.ts (L3 GitHub REST API — dipindah tanpa perubahan logic). Arsip: metrics-collector.service.ts (snapshot pra-split 17.1KB).** |
| **19 Juni 2026** | **S#294** | **Snapshot `sesi-294-email-alert-resend` dibuat. Implementasi email alert nyata via Resend: (1) buat lib/utils/resend.server.ts — shared utility sendResendEmail, pola sama dengan fonnte.server.ts; (2) update sendEmailAlert() di alert.service.ts — ganti stub SMTP → Resend nyata, ambil api_key+from_email+from_name dari M3. Arsip: 1 file (alert.service.ts).** |
| **16 Juni 2026** | **S#284** | **Snapshot `sesi-284-fix-option-hard-delete` dibuat. Fix: (1) tambah `dropdownRepo_destroyOption` di repository opsi; (2) tambah `MasterDropdownService_destroyOption` di service opsi; (3) tambah DELETE handler di `options/[id]/route.ts` (mode=hard: hard delete dengan verdict guard, mode=soft: nonaktifkan); (4) fix `DropdownOptionsPanel.tsx` — dialog hapus opsi sekarang kirim DELETE ?mode=hard bukan PATCH is_active=false. Sebelumnya "Hapus" di kebab = soft delete (S#122 keputusan salah Claude). Arsip: 4 file.** |
| **15 Juni 2026** | **S#282** | **Snapshot `sesi-282-menu-revalidate` dibuat. Tambah PATCH handler ke `app/api/superadmin/dashboard-menus/route.ts` untuk force-invalidate Vercel Data Cache tag `dashboard-menus:super_admin`. Diperlukan karena update DB langsung via Supabase MCP tidak trigger `revalidateTag` otomatis.** |
| **8 Juni 2026** | **CASE SESI-17** | **Snapshot `sesi-17-ui-standar` dibuat. Fix standar UI/UX: WilayahClient (tab #1a1a1a→#185FA5), MembershipsClient (TableHead/Cell override), RefundsClient (TableHead/Cell override), MonitoringClient (h1 text-xl→text-[20px], desc text-sm→text-[12px]).** |
