-- seed-code-registry.sql
-- Seed data untuk schema code_registry
-- Generated: Sesi #055 — 24 April 2026
-- Sumber: dump dari DB live Supabase
-- Total: 7 modules, 6 patterns, 6 constants, 67 functions
--
-- CARA PAKAI:
--   Jalankan di Supabase SQL Editor setelah create-code-registry.sql
--   File ini IDEMPOTENT — aman dijalankan ulang:
--   - TRUNCATE membersihkan data lama (CASCADE ke tabel dependen)
--   - INSERT fresh dengan UUID spesifik dari DB live
--
-- PERINGATAN:
--   TRUNCATE akan HAPUS semua data di code_registry termasuk cr_function_deps
--   dan cr_audit_log (CASCADE). Hanya jalankan jika ingin RESET ke kondisi seed.

-- ═══════════════════════════════════════════════════════════════════════════════
-- RESET DATA (CASCADE ke cr_function_deps + cr_audit_log)
-- ═══════════════════════════════════════════════════════════════════════════════

TRUNCATE code_registry.cr_functions CASCADE;
TRUNCATE code_registry.cr_constants CASCADE;
TRUNCATE code_registry.cr_patterns CASCADE;
TRUNCATE code_registry.cr_modules CASCADE;
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- MODULES (7)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO code_registry.cr_modules (module_id, module_name, module_path, description)
VALUES
  ('f5594d70-a7f7-41b3-ba72-9323ef098185', 'auth', '/app/api/auth + /lib/auth.ts + /lib/auth-server.ts + /lib/session.ts + /lib/account-lock.ts', 'Login, logout, OTP, biometric, session, account lock'),
  ('bf20f8de-dc5a-4e49-9dd5-abfe6f738474', 'config', '/app/api/config + /lib/config-registry.ts', 'Config Registry — konfigurasi bisnis dari DB'),
  ('83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'credential', '/lib/credential-reader.ts + /lib/credential-crypto.ts', 'Credential management — baca dan dekripsi API keys'),
  ('051c371f-3dc4-491c-a96c-d751b399f1fb', 'message', '/app/api/message-library + /lib/message-library.ts', 'Message Library — teks dan pesan dari DB'),
  ('b15252bc-89bb-4780-9516-67f0923b025f', 'shared', '/lib/', 'Shared helpers lintas modul (redis, cache, utils, policy)'),
  ('609bee4f-ab43-42e1-827e-d37a8a75fd53', 'superadmin', '/app/dashboard/superadmin', 'SuperAdmin dashboard'),
  ('304b969b-ef87-414c-bc73-96dbf4c1ad08', 'vendor', '/app/dashboard/vendor', 'Vendor dashboard')
ON CONFLICT (module_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PATTERNS (6)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO code_registry.cr_patterns (pattern_id, pattern_name, description, ai_instruction)
VALUES
  ('e6833d9a-b0e6-4147-a299-7b84d689a990', 'Config Registry Pattern', 'Semua nilai bisnis wajib dibaca dari DB via Layer 0, tidak boleh hardcode', 'SEBELUM hardcode: cek config_registry via getConfigValue() atau message_library via getMessage(). Kalau key belum ada — buat key baru di DB dulu.'),
  ('265a97ad-a403-45c3-9e18-1897041173cd', 'DTO Pattern', 'Data Transfer Object — shape data via Zod', 'Gunakan Zod schema. Validasi di Route Handler sebelum masuk Service.'),
  ('be9c4820-5957-4b68-bedb-2335742d35b9', 'Factory Pattern', 'Pembuatan objek kompleks melalui factory function', 'Pertimbangkan factory jika ada lebih dari 3 variasi pembuatan objek yang sama.'),
  ('ced437b6-a546-4bb6-9160-7cc94855c1d6', 'Observer/Event Pattern', 'Pub/Sub untuk komunikasi antar modul tanpa coupling langsung', 'Gunakan Supabase Realtime atau custom event emitter.'),
  ('34c01b2c-7e5a-45aa-8c69-166cfb864d61', 'Repository Pattern', 'Abstraksi akses database — semua query DB hanya melalui Repository', 'Buat file di lib/repositories/. HANYA query database. TIDAK ADA logika bisnis. Return raw entity.'),
  ('584d8531-3ba6-40fd-9544-86f16fbe9803', 'Service Layer', 'Layer logika bisnis — orchestrate Repository, validasi, kalkulasi', 'Buat file di lib/services/. SEMUA logika bisnis di sini. TIDAK BOLEH query DB langsung. Panggil Repository.')
ON CONFLICT (pattern_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSTANTS (6)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO code_registry.cr_constants (constant_id, constant_name, constant_type, module_id, file_path, "values", description)
VALUES
  ('2b1d7aff-0e68-4ff8-85ee-c103fea8846b', 'ACCOUNT_LOCK_STATUS', 'ENUM', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'lib/constants/account-lock-status.constant.ts', '{"LOCKED":"locked","UNLOCKED":"unlocked"}', 'Status kunci akun locked/unlocked.'),
  ('b4ee5044-a36d-4a90-9df3-07c47c20b643', 'OTP_TYPE', 'ENUM', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'lib/constants/otp-type.constant.ts', '{"LOGIN":"LOGIN","VERIFY_EMAIL":"VERIFY_EMAIL","RESET_PASSWORD":"RESET_PASSWORD"}', 'Jenis OTP 3 nilai.'),
  ('8e401b4f-8a32-46b7-9809-d52da0e7a95a', 'ROLES', 'ENUM', 'b15252bc-89bb-4780-9516-67f0923b025f', 'lib/constants/roles.constant.ts', '{"VENDOR":"VENDOR","FINANCE":"FINANCE","SUPPORT":"SUPPORT","CUSTOMER":"CUSTOMER","DISPATCHER":"DISPATCHER","SUPERADMIN":"SUPERADMIN","ADMIN_TENANT":"ADMIN_TENANT","PLATFORM_OWNER":"PLATFORM_OWNER"}', 'Semua role user platform. Export: ROLES, RoleType, ACTIVE_ROLES, ActiveRoleType.'),
  ('5c2e3772-a975-4c7d-848f-76b0e6cd01f3', 'SESSION_STATUS', 'ENUM', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'lib/constants/session-status.constant.ts', '{"ONLINE":"online","OFFLINE":"offline"}', 'Status user presence online/offline.'),
  ('c0394c40-d3c1-43ff-83f5-7902a036c3aa', 'UNLOCK_METHOD', 'ENUM', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'lib/constants/account-lock-status.constant.ts', '{"AUTO":"auto","MANUAL":"manual"}', 'Metode unlock auto/manual.'),
  ('492a0096-9ee9-420b-92eb-7364b3d1fa8d', 'VENDOR_STATUS', 'ENUM', '304b969b-ef87-414c-bc73-96dbf4c1ad08', 'lib/constants/vendor-status.constant.ts', '{"REVIEW":"REVIEW","PENDING":"PENDING","APPROVED":"APPROVED","REJECTED":"REJECTED","SUSPENDED":"SUSPENDED"}', 'Status vendor 5 nilai. Export: VENDOR_STATUS, VendorStatusType, VENDOR_LOGIN_ALLOWED.')
ON CONFLICT (constant_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS (67) — diurutkan per file_path
-- ═══════════════════════════════════════════════════════════════════════════════
-- Catatan: ON CONFLICT menggunakan func_name + module_id + layer
--          karena tabel tidak punya unique constraint pada func_name saja.
--          Jika sudah ada → skip (DO NOTHING).

-- lib/account-lock.ts (7 fungsi — semua DEPRECATED)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('buildLockPayload', 'FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/account-lock.ts', '[{"name":"data","type":"IncrementInput"},{"name":"existing","type":"AccountLockDoc|null"},{"name":"countBaru","type":"number"},{"name":"sekarang","type":"Date"}]', 'LockPayloadResult', 'Private helper — bangun payload INSERT/UPDATE account_locks. [DEPRECATED Sesi #052 — logika sudah di SP sp_increment_lock_count]', false, true, true, 'AI:claude'),
  ('checkAndResetExpiredLock', 'FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/account-lock.ts', '[{"name":"db","type":"SupabaseClient"},{"name":"existing","type":"AccountLockDoc|null"},{"name":"sekarang","type":"Date"}]', 'number', 'Private helper — cek apakah lock expired, reset count jika iya. [DEPRECATED Sesi #052 — file digantikan account-lock.service.ts, logika sudah di SP]', false, true, true, 'AI:claude'),
  ('executeLockOperation', 'FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/account-lock.ts', '[{"name":"db","type":"SupabaseClient"},{"name":"email","type":"string"},{"name":"payload","type":"Record<string,unknown>"},{"name":"existing","type":"AccountLockDoc|null"}]', 'void', 'Private helper — eksekusi INSERT/UPDATE ke account_locks. [DEPRECATED Sesi #052 — logika sudah di SP sp_increment_lock_count]', false, true, true, 'AI:claude'),
  ('getAccountLock', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/account-lock.ts', '[{"name":"email","type":"string"}]', 'Promise<AccountLockDoc | null>', 'Ambil record account_locks berdasarkan email [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('incrementLockCount', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/account-lock.ts', '[{"name":"data","type":"{uid, email, nama, nomor_wa, tenantId}"}]', 'Promise<{locked: boolean, lock_until?: Date, count: number}>', 'Increment percobaan login gagal, lock akun jika melebihi max_attempts [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('sendLockNotificationWA', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/account-lock.ts', '[{"name":"data","type":"{nomor_wa, nama, lock_until, max_login_attempts, superadmin_email, tenantId}"}]', 'Promise<{success: boolean, reason?: string}>', 'Kirim notifikasi WhatsApp via Fonnte saat akun dikunci [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('unlockAccount', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/account-lock.ts', '[{"name":"uid","type":"string"},{"name":"tenantId","type":"string|null"},{"name":"method","type":"auto|manual"},{"name":"unlockedByUid","type":"string"},{"name":"email","type":"string"}]', 'Promise<{success: boolean}>', 'Unlock akun yang terkunci, support auto (expired) dan manual (SuperAdmin) [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/auth-server.ts (1 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author, process_type, domain)
VALUES
  ('verifyJWT', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/auth-server.ts', '[]', 'Promise<JWTPayload | null>', 'Verifikasi session Supabase server-side, dibungkus react.cache() untuk eliminasi panggilan duplikat', true, false, true, 'AI:claude', 'SECURITY', 'auth')
ON CONFLICT DO NOTHING;

-- lib/auth.ts (3 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('clearSessionCookies', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/auth.ts', '[]', 'Promise<void>', 'Hapus semua session cookies', true, false, true, 'AI:claude'),
  ('performLogout', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/auth.ts', '[{"name":"supabase","type":"SupabaseClient"},{"name":"router","type":"AppRouterInstance"}]', 'Promise<void>', 'Logout user: sign out Supabase, hapus cookie, redirect ke /login', true, false, true, 'AI:claude'),
  ('setSessionCookies', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/auth.ts', '[{"name":"uid","type":"string"},{"name":"role","type":"string"},{"name":"tenantId","type":"string"},{"name":"displayName","type":"string"}]', 'Promise<void>', 'Set session cookies: uid, role, tenantId, displayName', true, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/config-registry.ts (5 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('getConfigValue', 'ASYNC_FUNCTION', 'bf20f8de-dc5a-4e49-9dd5-abfe6f738474', 'HELPER', 'lib/config-registry.ts', '[{"name":"featureKey","type":"string"},{"name":"policyKey","type":"string"}]', 'Promise<string | null>', 'Ambil satu config value spesifik dari config_registry', true, false, true, 'AI:claude'),
  ('getConfigValues', 'ASYNC_FUNCTION', 'bf20f8de-dc5a-4e49-9dd5-abfe6f738474', 'HELPER', 'lib/config-registry.ts', '[{"name":"featureKey","type":"string"}]', 'Promise<Record<string, string>>', 'Ambil semua config values untuk satu feature_key dari config_registry', true, false, true, 'AI:claude'),
  ('getPlatformTimezone', 'ASYNC_FUNCTION', 'bf20f8de-dc5a-4e49-9dd5-abfe6f738474', 'HELPER', 'lib/config-registry.ts', '[]', 'Promise<string>', 'Ambil timezone platform dari config_registry (default: Asia/Jakarta)', true, false, true, 'AI:claude'),
  ('parseConfigBoolean', 'FUNCTION', 'bf20f8de-dc5a-4e49-9dd5-abfe6f738474', 'HELPER', 'lib/config-registry.ts', '[{"name":"value","type":"string | undefined"},{"name":"fallback","type":"boolean"}]', 'boolean', 'Parse config value ke boolean dengan fallback', true, false, true, 'AI:claude'),
  ('parseConfigNumber', 'FUNCTION', 'bf20f8de-dc5a-4e49-9dd5-abfe6f738474', 'HELPER', 'lib/config-registry.ts', '[{"name":"value","type":"string | undefined"},{"name":"fallback","type":"number"}]', 'number', 'Parse config value ke number dengan fallback', true, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/credential-crypto.ts (3 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('dekripsi', 'FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'HELPER', 'lib/credential-crypto.ts', '[{"name":"ciphertext","type":"string"}]', 'string', 'Dekripsi base64(iv+authTag+ciphertext) kembali ke plaintext', false, false, true, 'AI:claude'),
  ('enkripsi', 'FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'HELPER', 'lib/credential-crypto.ts', '[{"name":"plaintext","type":"string"}]', 'string', 'Enkripsi nilai plaintext (API key, token) dengan AES-256-GCM, output base64', false, false, true, 'AI:claude'),
  ('fingerprint', 'FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'HELPER', 'lib/credential-crypto.ts', '[{"name":"value","type":"string"}]', 'string', 'Ambil 4 karakter terakhir credential untuk display di UI (misal: ...xyz)', false, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/credential-reader.ts (2 fungsi — DEPRECATED)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('getCredential', 'ASYNC_FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'HELPER', 'lib/credential-reader.ts', '[{"name":"provider","type":"string"},{"name":"keyName","type":"string"}]', 'Promise<string | null>', 'Ambil dan dekripsi satu credential dari service_credentials berdasarkan provider dan key [DEPRECATED Sesi #052 — digantikan Service layer]', true, true, true, 'AI:claude'),
  ('getCredentialsByProvider', 'ASYNC_FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'HELPER', 'lib/credential-reader.ts', '[{"name":"provider","type":"string"}]', 'Promise<Record<string, string>>', 'Ambil semua credential untuk satu provider, dekripsi semua [DEPRECATED Sesi #052 — digantikan Service layer]', true, true, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/hooks/useBiometric.ts (1 hook)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('useBiometric', 'HOOK', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/hooks/useBiometric.ts', null, 'UseBiometricReturn', 'Hook WebAuthn biometric — register + verify + isSupported', true, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/message-library.ts (3 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('getMessage', 'ASYNC_FUNCTION', '051c371f-3dc4-491c-a96c-d751b399f1fb', 'HELPER', 'lib/message-library.ts', '[{"name":"kode","type":"string"},{"name":"fallback","type":"string"}]', 'Promise<string>', 'Ambil teks pesan dari message_library berdasarkan kode, dengan fallback', true, false, true, 'AI:claude'),
  ('getMessagesByKategori', 'ASYNC_FUNCTION', '051c371f-3dc4-491c-a96c-d751b399f1fb', 'HELPER', 'lib/message-library.ts', '[{"name":"kategori","type":"string"}]', 'Promise<Record<string, string>>', 'Ambil semua pesan dalam satu kategori dari message_library', true, false, true, 'AI:claude'),
  ('interpolate', 'FUNCTION', '051c371f-3dc4-491c-a96c-d751b399f1fb', 'HELPER', 'lib/message-library.ts', '[{"name":"template","type":"string"},{"name":"vars","type":"Record<string, string>"}]', 'string', 'Ganti placeholder {key} dalam template dengan nilai dari vars', true, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/redis.ts (1 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('getRedisClient', 'FUNCTION', 'b15252bc-89bb-4780-9516-67f0923b025f', 'HELPER', 'lib/redis.ts', '[]', 'Redis', 'Inisialisasi dan return Upstash Redis client singleton', true, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/repositories/ (14 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('accountLockRepo_findByEmail', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/account-lock.repository.ts', null, 'AccountLockDoc | null', 'Cari record account_locks berdasarkan email', false, false, true, 'AI:claude'),
  ('accountLockRepo_spIncrementLockCount', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/account-lock.repository.ts', null, 'IncrementLockResult', 'SP sp_increment_lock_count — atomic increment+lock', false, false, true, 'AI:claude'),
  ('accountLockRepo_spUnlockAccount', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/account-lock.repository.ts', null, 'UnlockResult', 'SP sp_unlock_account — uid-first fallback email', false, false, true, 'AI:claude'),
  ('activityLogRepo_create', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/activity-log.repository.ts', null, 'void', 'Insert activity log', false, false, true, 'AI:claude'),
  ('credentialRepo_getAllByProvider', 'ASYNC_FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'REPOSITORY', 'lib/repositories/credential.repository.ts', null, 'Array<CredField>', 'Semua credential fields 1 provider', false, false, true, 'AI:claude'),
  ('credentialRepo_spGetCredential', 'ASYNC_FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'REPOSITORY', 'lib/repositories/credential.repository.ts', null, 'CredentialResult', 'SP sp_get_credential', false, false, true, 'AI:claude'),
  ('otpRepo_spVerifyAndConsume', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/otp.repository.ts', null, 'OTPVerifyResult', 'SP sp_verify_and_consume_otp — atomic verify', false, false, true, 'AI:claude'),
  ('otpRepo_upsert', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/otp.repository.ts', null, 'void', 'Hapus OTP lama + insert baru', false, false, true, 'AI:claude'),
  ('sessionLogRepo_create', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/session-log.repository.ts', null, 'string', 'Buat session log baru', false, false, true, 'AI:claude'),
  ('sessionLogRepo_findActiveByUid', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/session-log.repository.ts', null, 'SessionLogRow[]', 'Cari sesi aktif user', false, false, true, 'AI:claude'),
  ('sessionLogRepo_markLogout', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/session-log.repository.ts', null, 'void', 'Set logout_at semua sesi aktif', false, false, true, 'AI:claude'),
  ('presenceRepo_setOffline', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/user-presence.repository.ts', null, 'void', 'Set user offline tenant NULL-aware', false, false, true, 'AI:claude'),
  ('presenceRepo_spUpsert', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/user-presence.repository.ts', null, 'UpsertPresenceResult', 'SP sp_upsert_user_presence', false, false, true, 'AI:claude'),
  ('userRepo_findByEmail', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/user.repository.ts', null, 'UserLookupResult | null', 'Lookup 3 tahap: users → profiles → auth', true, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/repositories/ lanjutan (3 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('userRepo_findSuperAdminEmail', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'REPOSITORY', 'lib/repositories/user.repository.ts', '[]', 'Promise<string | null>', 'Ambil email SuperAdmin pertama dari tabel users. Dipakai untuk notifikasi lock.', false, false, true, 'AI:claude'),
  ('tenantRepo_findNamaBrandById', 'ASYNC_FUNCTION', 'b15252bc-89bb-4780-9516-67f0923b025f', 'REPOSITORY', 'lib/repositories/tenant.repository.ts', '[{"name":"tenantId","type":"string"}]', 'Promise<TenantNamaBrandResult | null>', 'Ambil nama_brand tenant berdasarkan ID. Return null jika tidak ditemukan.', false, false, true, 'AI:claude'),
  ('tenantRepo_findDefaultNamaBrand', 'ASYNC_FUNCTION', 'b15252bc-89bb-4780-9516-67f0923b025f', 'REPOSITORY', 'lib/repositories/tenant.repository.ts', '[]', 'Promise<TenantNamaBrandResult | null>', 'Ambil nama_brand dari tenant aktif pertama (fallback). Return null jika tidak ada.', false, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/services/ (14 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author, process_type, domain)
VALUES
  ('AccountLockService_getAccountLock', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/account-lock.service.ts', null, 'AccountLockDoc | null', 'Ambil record lock berdasarkan email via repo', true, false, true, 'AI:claude', 'AUTH', 'login'),
  ('AccountLockService_incrementLockCount', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/account-lock.service.ts', null, '{locked,lock_until,count,lock_count}', 'Baca config + panggil SP via repo — atomic', true, false, true, 'AI:claude', 'AUTH', 'login'),
  ('AccountLockService_sendLockNotificationWA', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/account-lock.service.ts', null, '{success,reason?}', 'Kirim WA via Fonnte — cek config notify dulu', true, false, true, 'AI:claude', 'NOTIFICATION', 'login'),
  ('AccountLockService_unlockAccount', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/account-lock.service.ts', null, 'UnlockResult', 'Unlock via SP — object param (refactor 5→1)', true, false, true, 'AI:claude', 'AUTH', 'login'),
  ('ActivityService_setUserOffline', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/activity.service.ts', null, 'void', 'Set offline via repo — non-throwing', true, false, true, 'AI:claude', null, null),
  ('ActivityService_updateUserPresence', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/activity.service.ts', null, 'void', 'Update presence via SP — non-throwing', true, false, true, 'AI:claude', null, null),
  ('ActivityService_writeActivityLog', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/activity.service.ts', null, 'void', 'Cek policy + insert log via repo', true, false, true, 'AI:claude', null, null),
  ('CredentialService_getCredential', 'ASYNC_FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'SERVICE', 'lib/services/credential.service.ts', null, 'string | null', 'Ambil 1 credential — DB cache + env fallback', true, false, true, 'AI:claude', null, null),
  ('CredentialService_getCredentialsByProvider', 'ASYNC_FUNCTION', '83403a21-18d7-436f-ac0c-bcf57b89fd8e', 'SERVICE', 'lib/services/credential.service.ts', null, 'Record<string,string>', 'Ambil semua credential 1 provider — cache + env', true, false, true, 'AI:claude', null, null),
  ('OTPService_sendOTP', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/otp.service.ts', null, 'SendOTPResult', 'Generate + save + kirim WA — full orchestration', true, false, true, 'AI:claude', null, null),
  ('OTPService_verifyAndConsume', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/otp.service.ts', null, 'OTPVerifyResult', 'Verify OTP atomic via SP', true, false, true, 'AI:claude', null, null),
  ('SessionService_findActiveSessions', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/session.service.ts', null, 'SessionLogRow[]', 'Cari sesi aktif untuk concurrent check', true, false, true, 'AI:claude', null, null),
  ('SessionService_markLogout', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/session.service.ts', null, 'void', 'Mark semua sesi aktif sebagai logout', true, false, true, 'AI:claude', null, null),
  ('SessionService_writeSessionLog', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'SERVICE', 'lib/services/session.service.ts', null, 'string', 'Buat session log — generate ID + insert', true, false, true, 'AI:claude', null, null)
ON CONFLICT DO NOTHING;

-- lib/session-client.ts (3 fungsi)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('generateOTP', 'FUNCTION', 'b15252bc-89bb-4780-9516-67f0923b025f', 'HELPER', 'lib/session-client.ts', null, 'string', 'Generate kode OTP 6 digit random', true, false, true, 'AI:claude'),
  ('getDeviceInfo', 'FUNCTION', 'b15252bc-89bb-4780-9516-67f0923b025f', 'HELPER', 'lib/session-client.ts', null, 'string', 'Baca browser + OS dari user agent', true, false, true, 'AI:claude'),
  ('getGPSLocation', 'ASYNC_FUNCTION', 'b15252bc-89bb-4780-9516-67f0923b025f', 'HELPER', 'lib/session-client.ts', null, '{lat,lng,kota}', 'GPS + reverse geocode Nominatim — cached', true, false, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- lib/session.ts (6 fungsi — semua DEPRECATED)
INSERT INTO code_registry.cr_functions (func_name, func_type, module_id, layer, file_path, parameters, return_type, description, is_shared, is_deprecated, ai_generated, author)
VALUES
  ('generateOTP', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/session.ts', '[{"name":"email","type":"string"},{"name":"type","type":"string"}]', 'Promise<{otp: string, expiresAt: Date}>', 'Generate OTP 6 digit, simpan ke DB, return OTP + expiry [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('getDeviceInfo', 'FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/session.ts', '[]', 'DeviceInfo', 'Ambil info device dari navigator/user-agent untuk logging [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('getGPSLocation', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/session.ts', '[]', 'Promise<{latitude: number, longitude: number} | null>', 'Ambil GPS location via browser Geolocation API (non-blocking) [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('registerBiometric', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/session.ts', '[{"name":"uid","type":"string"},{"name":"deviceInfo","type":"DeviceInfo"}]', 'Promise<{success: boolean}>', 'Register WebAuthn credential untuk biometric login [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('verifyBiometric', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/session.ts', '[{"name":"uid","type":"string"},{"name":"assertion","type":"AuthenticatorAssertionResponse"}]', 'Promise<{valid: boolean}>', 'Verifikasi biometric assertion terhadap credential tersimpan [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('verifyOTP', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/session.ts', '[{"name":"email","type":"string"},{"name":"otp","type":"string"},{"name":"type","type":"string"}]', 'Promise<{valid: boolean, message?: string}>', 'Verifikasi OTP yang dimasukkan user terhadap DB [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude'),
  ('writeSessionLog', 'ASYNC_FUNCTION', 'f5594d70-a7f7-41b3-ba72-9323ef098185', 'HELPER', 'lib/session.ts', '[{"name":"params","type":"SessionLogParams"}]', 'Promise<void>', 'Tulis log session ke tabel session_logs (login, logout, aktivitas) [DEPRECATED Sesi #052 — digantikan Service layer]', false, true, true, 'AI:claude')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFIKASI
-- ═══════════════════════════════════════════════════════════════════════════════

-- Jalankan setelah seed untuk verifikasi:
-- SELECT 'modules' AS tabel, count(*) FROM code_registry.cr_modules
-- UNION ALL SELECT 'patterns', count(*) FROM code_registry.cr_patterns
-- UNION ALL SELECT 'constants', count(*) FROM code_registry.cr_constants
-- UNION ALL SELECT 'functions', count(*) FROM code_registry.cr_functions
-- UNION ALL SELECT 'deprecated', count(*) FROM code_registry.cr_functions WHERE is_deprecated = true;

-- Expected: modules=7, patterns=6, constants=6, functions=67, deprecated=16, deps=35

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTION DEPENDENCIES (35)
-- Lookup by func_name+file_path agar tidak tergantung UUID spesifik
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO code_registry.cr_function_deps (from_func_id, to_func_id, dep_type)
SELECT caller.func_id, callee.func_id, 'CALLS'
FROM (VALUES
  -- AccountLockService → Repository + Helper
  ('AccountLockService_getAccountLock',       'lib/services/account-lock.service.ts',  'accountLockRepo_findByEmail',           'lib/repositories/account-lock.repository.ts'),
  ('AccountLockService_incrementLockCount',   'lib/services/account-lock.service.ts',  'getConfigValues',                       'lib/config-registry.ts'),
  ('AccountLockService_incrementLockCount',   'lib/services/account-lock.service.ts',  'parseConfigNumber',                     'lib/config-registry.ts'),
  ('AccountLockService_incrementLockCount',   'lib/services/account-lock.service.ts',  'accountLockRepo_spIncrementLockCount',  'lib/repositories/account-lock.repository.ts'),
  ('AccountLockService_unlockAccount',        'lib/services/account-lock.service.ts',  'accountLockRepo_spUnlockAccount',       'lib/repositories/account-lock.repository.ts'),
  ('AccountLockService_sendLockNotificationWA','lib/services/account-lock.service.ts', 'getConfigValues',                       'lib/config-registry.ts'),
  ('AccountLockService_sendLockNotificationWA','lib/services/account-lock.service.ts', 'parseConfigBoolean',                    'lib/config-registry.ts'),
  ('AccountLockService_sendLockNotificationWA','lib/services/account-lock.service.ts', 'CredentialService_getCredential',       'lib/services/credential.service.ts'),
  ('AccountLockService_sendLockNotificationWA','lib/services/account-lock.service.ts', 'tenantRepo_findNamaBrandById',          'lib/repositories/tenant.repository.ts'),
  ('AccountLockService_sendLockNotificationWA','lib/services/account-lock.service.ts', 'tenantRepo_findDefaultNamaBrand',       'lib/repositories/tenant.repository.ts'),
  ('AccountLockService_sendLockNotificationWA','lib/services/account-lock.service.ts', 'getPlatformTimezone',                   'lib/config-registry.ts'),
  ('AccountLockService_sendLockNotificationWA','lib/services/account-lock.service.ts', 'getMessage',                            'lib/message-library.ts'),
  ('AccountLockService_sendLockNotificationWA','lib/services/account-lock.service.ts', 'interpolate',                           'lib/message-library.ts'),
  -- ActivityService → Repository
  ('ActivityService_updateUserPresence',      'lib/services/activity.service.ts',      'presenceRepo_spUpsert',                 'lib/repositories/user-presence.repository.ts'),
  ('ActivityService_setUserOffline',          'lib/services/activity.service.ts',      'presenceRepo_setOffline',               'lib/repositories/user-presence.repository.ts'),
  ('ActivityService_writeActivityLog',        'lib/services/activity.service.ts',      'activityLogRepo_create',                'lib/repositories/activity-log.repository.ts'),
  -- OTPService → Repository + Helper
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'otpRepo_upsert',                        'lib/repositories/otp.repository.ts'),
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'CredentialService_getCredential',        'lib/services/credential.service.ts'),
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'getConfigValues',                       'lib/config-registry.ts'),
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'parseConfigNumber',                     'lib/config-registry.ts'),
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'getPlatformTimezone',                   'lib/config-registry.ts'),
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'getMessage',                            'lib/message-library.ts'),
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'interpolate',                           'lib/message-library.ts'),
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'tenantRepo_findNamaBrandById',          'lib/repositories/tenant.repository.ts'),
  ('OTPService_sendOTP',                     'lib/services/otp.service.ts',            'tenantRepo_findDefaultNamaBrand',       'lib/repositories/tenant.repository.ts'),
  ('OTPService_verifyAndConsume',             'lib/services/otp.service.ts',           'otpRepo_spVerifyAndConsume',             'lib/repositories/otp.repository.ts'),
  -- SessionService → Repository
  ('SessionService_writeSessionLog',         'lib/services/session.service.ts',        'sessionLogRepo_create',                 'lib/repositories/session-log.repository.ts'),
  ('SessionService_markLogout',              'lib/services/session.service.ts',        'sessionLogRepo_markLogout',              'lib/repositories/session-log.repository.ts'),
  ('SessionService_findActiveSessions',      'lib/services/session.service.ts',        'sessionLogRepo_findActiveByUid',         'lib/repositories/session-log.repository.ts'),
  -- CredentialService → Repository + crypto
  ('CredentialService_getCredential',        'lib/services/credential.service.ts',     'credentialRepo_spGetCredential',         'lib/repositories/credential.repository.ts'),
  ('CredentialService_getCredential',        'lib/services/credential.service.ts',     'dekripsi',                              'lib/credential-crypto.ts'),
  ('CredentialService_getCredentialsByProvider','lib/services/credential.service.ts',   'credentialRepo_getAllByProvider',        'lib/repositories/credential.repository.ts'),
  ('CredentialService_getCredentialsByProvider','lib/services/credential.service.ts',   'dekripsi',                              'lib/credential-crypto.ts'),
  -- auth.ts
  ('clearSessionCookies',                    'lib/auth.ts',                            'performLogout',                         'lib/auth.ts'),
  -- useBiometric → session-client
  ('useBiometric',                           'lib/hooks/useBiometric.ts',              'getDeviceInfo',                         'lib/session-client.ts')
) AS deps(caller_name, caller_path, callee_name, callee_path)
JOIN code_registry.cr_functions caller ON caller.func_name = deps.caller_name AND caller.file_path = deps.caller_path
JOIN code_registry.cr_functions callee ON callee.func_name = deps.callee_name AND callee.file_path = deps.callee_path
ON CONFLICT DO NOTHING;

-- seed-code-registry.sql — Generated Sesi #055 — 24 April 2026
-- Sumber: dump dari DB live Supabase
