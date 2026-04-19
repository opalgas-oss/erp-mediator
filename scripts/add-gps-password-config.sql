-- =============================================================
-- add-gps-password-config.sql
-- Jalankan di Supabase Dashboard → SQL Editor SETELAH add-policy-key-migration.sql
-- Tambah 4 item baru ke config_registry:
--   - gps_timeout_seconds
--   - gps_cache_ttl_minutes
--   - gps_mode
--   - password_min_length
-- =============================================================

-- 1. Tambah 4 item baru ke config_registry
INSERT INTO public.config_registry
  (feature_key, tenant_id, policy_key, label, kategori, nilai, tipe_data, akses_baca, akses_ubah, nilai_enum, is_active, updated_at)
VALUES
  ('security_login', NULL, 'gps_timeout_seconds',  'Timeout GPS (detik)',           'GPS',       '10',       'number',  ARRAY['superadmin','admin'], ARRAY['superadmin'], NULL,                               true, now()),
  ('security_login', NULL, 'gps_cache_ttl_minutes', 'Cache lokasi GPS (menit)',      'GPS',       '30',       'number',  ARRAY['superadmin','admin'], ARRAY['superadmin'], NULL,                               true, now()),
  ('security_login', NULL, 'gps_mode',              'Mode GPS',                      'GPS',       'required', 'select',  ARRAY['superadmin'],         ARRAY['superadmin'], ARRAY['required','optional'],       true, now()),
  ('security_login', NULL, 'password_min_length',   'Panjang minimum password',      'Validasi',  '8',        'number',  ARRAY['superadmin','admin'], ARRAY['superadmin'], NULL,                               true, now())
ON CONFLICT DO NOTHING;

-- 2. Update message_library — pesan password min length jadi dinamis
UPDATE public.message_library
SET teks     = 'Password minimal {min_panjang} karakter.',
    variabel = ARRAY['min_panjang'],
    updated_at = now()
WHERE key = 'login_validasi_password_min';

-- 3. Verifikasi — harus tampil 20 baris (16 lama + 4 baru)
SELECT policy_key, label, nilai, kategori
FROM public.config_registry
WHERE feature_key = 'security_login' AND tenant_id IS NULL
ORDER BY kategori, policy_key;
