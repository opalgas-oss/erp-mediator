-- scripts/add-redis-cache-ttl-config.sql
-- Tambah 4 key baru di config_registry feature_key 'platform_general'
-- untuk menggantikan nilai hardcode di lib/redis.ts dan layout.tsx
-- Dibuat Sesi #045 — fix pelanggaran aturan anti-hardcode
--
-- Cara jalankan:
--   Supabase Dashboard → SQL Editor → paste → Run
--
-- Idempoten: INSERT hanya dijalankan jika key belum ada

-- Key 1: TTL Redis untuk cache config (detik)
INSERT INTO config_registry (feature_key, policy_key, tenant_id, label, kategori, nilai, tipe_data, akses_baca, akses_ubah, nilai_enum, is_active, updated_at)
SELECT
  'platform_general',
  'redis_ttl_config_seconds',
  NULL,
  'Redis TTL — Config Cache (detik)',
  'Cache',
  '600',
  'number',
  ARRAY['superadmin'],
  ARRAY['superadmin'],
  NULL,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM config_registry
  WHERE feature_key = 'platform_general'
    AND policy_key  = 'redis_ttl_config_seconds'
    AND tenant_id IS NULL
);

-- Key 2: TTL Redis untuk cache pesan UI (detik)
INSERT INTO config_registry (feature_key, policy_key, tenant_id, label, kategori, nilai, tipe_data, akses_baca, akses_ubah, nilai_enum, is_active, updated_at)
SELECT
  'platform_general',
  'redis_ttl_messages_seconds',
  NULL,
  'Redis TTL — Pesan UI Cache (detik)',
  'Cache',
  '900',
  'number',
  ARRAY['superadmin'],
  ARRAY['superadmin'],
  NULL,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM config_registry
  WHERE feature_key = 'platform_general'
    AND policy_key  = 'redis_ttl_messages_seconds'
    AND tenant_id IS NULL
);

-- Key 3: TTL Redis untuk cache credential API (detik)
INSERT INTO config_registry (feature_key, policy_key, tenant_id, label, kategori, nilai, tipe_data, akses_baca, akses_ubah, nilai_enum, is_active, updated_at)
SELECT
  'platform_general',
  'redis_ttl_credentials_seconds',
  NULL,
  'Redis TTL — Credential API Cache (detik)',
  'Cache',
  '900',
  'number',
  ARRAY['superadmin'],
  ARRAY['superadmin'],
  NULL,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM config_registry
  WHERE feature_key = 'platform_general'
    AND policy_key  = 'redis_ttl_credentials_seconds'
    AND tenant_id IS NULL
);

-- Key 4: TTL sidebar dashboard cache (detik)
INSERT INTO config_registry (feature_key, policy_key, tenant_id, label, kategori, nilai, tipe_data, akses_baca, akses_ubah, nilai_enum, is_active, updated_at)
SELECT
  'platform_general',
  'sidebar_cache_ttl_seconds',
  NULL,
  'Cache TTL — Sidebar Dashboard (detik)',
  'Cache',
  '1800',
  'number',
  ARRAY['superadmin'],
  ARRAY['superadmin'],
  NULL,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM config_registry
  WHERE feature_key = 'platform_general'
    AND policy_key  = 'sidebar_cache_ttl_seconds'
    AND tenant_id IS NULL
);

-- Verifikasi hasil
SELECT policy_key, nilai, label
FROM config_registry
WHERE feature_key = 'platform_general'
ORDER BY policy_key;
